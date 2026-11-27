package com.dxckie.mahiro

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.os.Build
import android.os.SystemClock
import android.view.Choreographer
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.view.WindowInsets
import android.widget.FrameLayout
import kotlin.math.hypot
import kotlin.random.Random

/** Draws the current sprite; the art faces left, so it is mirrored when the pet faces right. */
internal class PetView(context: Context) : View(context) {
	var frame: Bitmap? = null
	var flip = false
	private val paint = Paint(Paint.FILTER_BITMAP_FLAG or Paint.ANTI_ALIAS_FLAG)
	private val dest = RectF()

	init {
		// Moving the pet then only moves a GPU texture; it is redrawn only when the sprite changes.
		setLayerType(LAYER_TYPE_HARDWARE, null)
	}

	override fun onDraw(canvas: Canvas) {
		val bmp = frame ?: return
		dest.set(0f, 0f, width.toFloat(), height.toFloat())
		if (flip) {
			canvas.save()
			canvas.scale(-1f, 1f, width / 2f, 0f)
			canvas.drawBitmap(bmp, null, dest, paint)
			canvas.restore()
		} else {
			canvas.drawBitmap(bmp, null, dest, paint)
		}
	}

	/** Only the drawn character takes touches; the transparent corners of the sprite let them through. */
	private fun hits(x: Float, y: Float): Boolean {
		val bmp = frame ?: return false
		val cx = if (flip) width - x else x
		val px = (cx * bmp.width / width).toInt().coerceIn(0, bmp.width - 1)
		val py = (y * bmp.height / height).toInt().coerceIn(0, bmp.height - 1)
		return (bmp.getPixel(px, py) ushr 24) > 40
	}

	override fun onTouchEvent(event: MotionEvent): Boolean {
		if (event.actionMasked == MotionEvent.ACTION_DOWN && !hits(event.x, event.y)) return false
		return runCatching { Pet.onTouch(event) }.getOrDefault(false)
	}
}

/**
 * Runs the Shimeji animation graph (animation.json) on a [PetView] added to Discord's window.
 * Everything here runs on the main thread. One tick is 40 ms (25 per second), the unit of
 * `durationTicks` and of a frame's `dx` / `dy`. Ticks run from the display's vsync, and the
 * drawn position is interpolated between ticks so movement is smooth at any refresh rate.
 */
internal object Pet {
	private const val TICK_MS = 40L

	private val frameCallback = Choreographer.FrameCallback { onFrame(it) }
	private var running = false
	private var lastNanos = 0L
	private var acc = 0f
	private var prevX = 0f
	private var prevY = 0f
	private var rootCheckAt = 0L

	private var script: Script? = null
	private var move: Move? = null
	private var frameIdx = 0
	private var frameTick = 0
	private var moveTicks = 0
	private var airTicks = 0
	private var tickLimit = Int.MAX_VALUE
	/** -1 faces left (the art's own direction), 1 faces right. */
	private var facing = -1

	private var decor: ViewGroup? = null
	private var view: PetView? = null
	private var size = 0f
	/** Pixels per `dx` / `dy` unit: a 96 dp pet moves 1 dp per unit at the default speed. */
	private var unit = 1f
	private var x = 0f
	private var y = 0f
	private var posReady = false

	/** minX, maxX, minY, maxY of the view's top-left corner, so the body (not the padding) meets the edges. */
	private val bounds = FloatArray(4)
	private var boundsAt = 0L

	private var pressing = false
	private var dragging = false
	private var flinging = false
	private var downX = 0f
	private var downY = 0f
	private var downAt = 0L
	private var offX = 0f
	private var offY = 0f
	private var fvx = 0f
	private var fvy = 0f
	private val history = ArrayDeque<FloatArray>()

	// ---------------------------------------------------------------- lifecycle

	fun start() {
		if (!Settings.show) return
		if (script == null) {
			val text = resource("animation.json")?.use { it.readBytes().toString(Charsets.UTF_8) } ?: return
			script = Script.parse(text)
		}
		running = true
		lastNanos = 0
		Choreographer.getInstance().removeFrameCallback(frameCallback)
		Choreographer.getInstance().postFrameCallback(frameCallback)
	}

	fun stopNow() {
		running = false
		Choreographer.getInstance().removeFrameCallback(frameCallback)
		detach()
		posReady = false
		dragging = false
		flinging = false
		pressing = false
	}

	/** Brings the pet to the middle of the screen; it drops from there. */
	fun recenter() {
		Settings.show = true
		start()
		if (!ensureAttached()) return
		val b = bounds(true)
		spawn((b[0] + b[1]) / 2f, (b[2] + b[3]) / 2f)
	}

	/** Size or speed changed. */
	fun resize() {
		val v = view ?: return
		val old = size
		measure()
		x += (old - size) / 2f
		y += old - size
		prevX = x
		prevY = y
		v.layoutParams = v.layoutParams.apply { width = size.toInt(); height = size.toInt() }
		boundsAt = 0
	}

	private fun measure() {
		size = dp(Settings.sizeDp.toFloat())
		unit = size / 96f * Settings.speed / 100f
		Sprites.load(size.toInt())
	}

	private fun ensureAttached(): Boolean {
		// Looking through every window is slow; once the pet is attached, check twice a second.
		val now = SystemClock.uptimeMillis()
		val current = view
		if (current != null && now - rootCheckAt < 500 && current.isAttachedToWindow) return true
		rootCheckAt = now
		val root = windowRoots().filterIsInstance<ViewGroup>().maxByOrNull { it.width.toLong() * it.height } ?: return false
		if (decor === root && view?.parent === root) return true
		detach()
		decor = root
		measure()
		val pet = PetView(root.context)
		root.addView(pet, FrameLayout.LayoutParams(size.toInt(), size.toInt()))
		view = pet
		posReady = false
		return true
	}

	private fun detach() {
		(view?.parent as? ViewGroup)?.removeView(view)
		view = null
		decor = null
	}

	/** The edges the pet can reach: under the status bar, above the nav bar or keyboard. */
	private fun bounds(force: Boolean = false): FloatArray {
		val now = SystemClock.uptimeMillis()
		if (!force && now - boundsAt < 400) return bounds
		val root = decor ?: return bounds
		var top = 0
		var bottom = 0
		runCatching {
			val insets = root.rootWindowInsets
			if (insets != null) {
				if (Build.VERSION.SDK_INT >= 30) {
					val bars = insets.getInsets(WindowInsets.Type.systemBars())
					top = bars.top
					bottom = maxOf(bars.bottom, insets.getInsets(WindowInsets.Type.ime()).bottom)
				} else {
					@Suppress("DEPRECATION")
					top = insets.systemWindowInsetTop
					@Suppress("DEPRECATION")
					bottom = insets.systemWindowInsetBottom
				}
			}
		}
		// The sprites have transparent room around the body: 11% at the sides, 9% on top, 10% below.
		bounds[0] = -size * 0.11f
		bounds[1] = (root.width - size * 0.89f).coerceAtLeast(bounds[0])
		bounds[2] = top - size * 0.09f
		bounds[3] = (root.height - bottom - size * 0.90f).coerceAtLeast(bounds[2])
		boundsAt = now
		return bounds
	}

	// ---------------------------------------------------------------- loop

	private fun onFrame(nanos: Long) {
		if (!running) return
		acc += if (lastNanos == 0L) 0f else ((nanos - lastNanos) / 1_000_000f).coerceAtMost(4f * TICK_MS)
		lastNanos = nanos
		runCatching {
			while (acc >= TICK_MS) {
				acc -= TICK_MS
				prevX = x
				prevY = y
				step()
			}
			render()
		}.onFailure { android.util.Log.e("MahiroOyama", "frame failed", it) }
		if (running) Choreographer.getInstance().postFrameCallback(frameCallback)
	}

	private fun step() {
		if (!ensureAttached()) return
		val s = script ?: return
		val b = bounds()
		if (!posReady) spawn(b[0] + Random.nextFloat() * (b[1] - b[0]), b[2])
		var m = move ?: return
		// The keyboard went away under a pet standing on it: it falls, like Shimeji off a closed window.
		if (!dragging && !flinging && m.type == "GROUND" && y < b[3] - dp(3f)) {
			enter(s.moves[s.default] ?: return)
			m = move ?: return
		}
		if (flinging) stepFling(b) else if (!dragging) stepMove(m, b)

		val cur = move ?: return
		moveTicks++
		airTicks++
		var finished = false
		if (++frameTick >= cur.frames[frameIdx].ticks) {
			frameTick = 0
			frameIdx++
			if (frameIdx >= cur.frames.size) {
				if (cur.loop) {
					frameIdx = 0
				} else {
					frameIdx = cur.frames.size - 1
					finished = true
				}
			}
		}
		if (!dragging && !flinging && (finished || moveTicks >= tickLimit)) go(cur.onFinish)
	}

	private fun stepMove(m: Move, b: FloatArray) {
		val f = m.frames[frameIdx]
		var dy = f.dy * unit
		// Falling speeds up to three times its listed rate.
		if (m.type == "AIR" && m.subtype == "FALLING") dy *= (1f + airTicks / 20f).coerceAtMost(3f)
		x = (x + f.dx * unit).coerceIn(b[0], b[1])
		y = (y + dy).coerceIn(b[2], b[3])
		val touched = touches(b, 1f)
		if (touched.isEmpty()) return
		val t = pickBorder(m, touched) ?: return
		go(t.choices)
	}

	private fun stepFling(b: FloatArray) {
		val dt = TICK_MS / 1000f
		fvy += dp(2200f) * dt
		val nx = x + fvx * dt
		val ny = y + fvy * dt
		val touched = HashSet<Border>()
		if (nx <= b[0]) touched.add(Border.LEFT)
		if (nx >= b[1]) touched.add(Border.RIGHT)
		if (ny <= b[2]) touched.add(Border.TOP)
		if (ny >= b[3]) touched.add(Border.BOTTOM)
		x = nx.coerceIn(b[0], b[1])
		y = ny.coerceIn(b[2], b[3])
		if (touched.isEmpty()) return
		flinging = false
		if (!fireEvent("FLING_END", touched)) fall()
	}

	private fun touches(b: FloatArray, tolerance: Float): Set<Border> {
		val out = HashSet<Border>()
		if (x <= b[0] + tolerance) out.add(Border.LEFT)
		if (x >= b[1] - tolerance) out.add(Border.RIGHT)
		if (y <= b[2] + tolerance) out.add(Border.TOP)
		if (y >= b[3] - tolerance) out.add(Border.BOTTOM)
		return out
	}

	// ---------------------------------------------------------------- graph

	private fun facingName() = if (facing < 0) "LEFT" else "RIGHT"

	private fun spawn(atX: Float, atY: Float) {
		val s = script ?: return
		x = atX
		y = atY
		prevX = atX
		prevY = atY
		posReady = true
		dragging = false
		flinging = false
		val key = s.initial.randomOrNull() ?: s.default
		enter(s.moves[key] ?: s.moves.values.firstOrNull() ?: return)
	}

	private fun fall() {
		val s = script ?: return
		enter(s.moves[s.default] ?: return)
	}

	/** Starts [m]; ground, wall and ceiling moves are put against the edge they belong to. */
	private fun enter(m: Move) {
		move = m
		frameIdx = 0
		frameTick = 0
		moveTicks = 0
		airTicks = 0
		tickLimit = if (m.hasAuto && m.loop && m.maxTicks > 0) Random.nextInt(m.minTicks, maxOf(m.minTicks, m.maxTicks) + 1) else Int.MAX_VALUE
		val b = bounds()
		when (m.type) {
			"GROUND" -> y = b[3]
			"WALL" -> x = if (facing < 0) b[0] else b[1]
			"CEILING" -> y = b[2]
		}
	}

	private fun applyFacing(name: String?) {
		when (name) {
			"LEFT" -> facing = -1
			"RIGHT" -> facing = 1
			"RANDOM" -> facing = if (Random.nextBoolean()) 1 else -1
			"EVENT_VELOCITY" -> if (fvx != 0f) facing = if (fvx < 0) -1 else 1
		}
	}

	/** Picks one of [choices] by weight and moves to it; false when there is nothing to go to. */
	private fun go(choices: List<Choice>): Boolean {
		val s = script ?: return false
		val total = choices.sumOf { it.weight.toDouble() }
		if (choices.isEmpty() || total <= 0.0) return false
		var roll = Random.nextDouble() * total
		var chosen = choices.last()
		for (c in choices) {
			roll -= c.weight
			if (roll < 0) { chosen = c; break }
		}
		val next = s.moves[chosen.to] ?: return false
		applyFacing(chosen.facing)
		enter(next)
		return true
	}

	/** The most specific border rule (a matching facing ranks higher), else none. */
	private fun pickBorder(m: Move, touched: Set<Border>): Transition? {
		var best: Transition? = null
		var bestScore = -1
		for (t in m.borders) {
			val edge = t.whenBorder ?: continue
			if (edge !in touched) continue
			if (t.facing != null && t.facing != facingName()) continue
			val score = if (t.facing != null) 2 else 1
			if (score > bestScore) { best = t; bestScore = score }
		}
		return best
	}

	/** Runs the best matching event rule: this move's own, else the global ones. */
	private fun fireEvent(name: String, touched: Set<Border>): Boolean {
		val s = script ?: return false
		val m = move ?: return false
		var best: Transition? = null
		var bestScore = -1
		for (t in m.events + s.events) {
			if (t.event != name) continue
			var score = 0
			if (t.from != null && t.from != "*") {
				if (t.from != m.key) continue
				score += 2
			}
			if (t.whenBorder != null) {
				if (t.whenBorder !in touched) continue
				score++
			}
			if (t.facing != null) {
				if (t.facing != facingName()) continue
				score++
			}
			if (t.allowedTypes != null) {
				if (m.type !in t.allowedTypes) continue
				score++
			}
			if (score > bestScore) { best = t; bestScore = score }
		}
		return best != null && go(best.choices)
	}

	// ---------------------------------------------------------------- touch

	fun onTouch(event: MotionEvent): Boolean {
		val now = SystemClock.uptimeMillis()
		val rx = event.rawX
		val ry = event.rawY
		when (event.actionMasked) {
			MotionEvent.ACTION_DOWN -> {
				pressing = true
				downX = rx; downY = ry; downAt = now
				offX = rx - x; offY = ry - y
				history.clear()
				history.addLast(floatArrayOf(now.toFloat(), rx, ry))
			}
			MotionEvent.ACTION_MOVE -> {
				history.addLast(floatArrayOf(now.toFloat(), rx, ry))
				while (history.size > 2 && now - history.first()[0] > 100f) history.removeFirst()
				if (pressing && !dragging && !flinging && hypot(rx - downX, ry - downY) > dp(8f)) {
					dragging = true
					haptic()
					fireEvent("DRAG_START", emptySet())
				}
				if (dragging) {
					val b = bounds()
					x = (rx - offX).coerceIn(b[0], b[1])
					y = (ry - offY).coerceIn(b[2], b[3])
				}
			}
			MotionEvent.ACTION_UP, MotionEvent.ACTION_CANCEL -> release(event.actionMasked == MotionEvent.ACTION_CANCEL, now)
		}
		return true
	}

	private fun release(cancelled: Boolean, now: Long) {
		pressing = false
		if (dragging) {
			dragging = false
			val first = history.firstOrNull()
			val last = history.lastOrNull()
			val seconds = if (first != null && last != null) (last[0] - first[0]) / 1000f else 0f
			val cap = dp(2500f)
			val vx = if (seconds > 0.005f) ((last!![1] - first!![1]) / seconds).coerceIn(-cap, cap) else 0f
			val vy = if (seconds > 0.005f) ((last!![2] - first!![2]) / seconds).coerceIn(-cap, cap) else 0f
			if (!cancelled && hypot(vx, vy) > dp(900f)) {
				fvx = vx
				fvy = vy
				flinging = fireEvent("FLING_START", emptySet())
				if (!flinging) fall()
			} else if (!fireEvent("DRAG_END", touches(bounds(true), dp(16f)))) {
				fall()
			}
		} else if (!cancelled && now - downAt < 400) {
			haptic()
			fireEvent("TAP", emptySet())
		}
	}

	private fun haptic() {
		if (Settings.haptics) view?.performHapticFeedback(HapticFeedbackConstants.KEYBOARD_TAP)
	}

	// ---------------------------------------------------------------- draw

	private fun render() {
		val v = view ?: return
		val m = move ?: return
		val bmp = Sprites.get(m.frames[frameIdx].sprite)
		val flip = facing > 0
		if (v.frame !== bmp || v.flip != flip) {
			v.frame = bmp
			v.flip = flip
			v.invalidate()
		}
		// Between ticks the pet is drawn part of the way from its last position to its new one;
		// while dragged it sticks to the finger.
		val t = if (dragging) 1f else (acc / TICK_MS).coerceIn(0f, 1f)
		v.translationX = prevX + (x - prevX) * t
		v.translationY = prevY + (y - prevY) * t
	}
}
