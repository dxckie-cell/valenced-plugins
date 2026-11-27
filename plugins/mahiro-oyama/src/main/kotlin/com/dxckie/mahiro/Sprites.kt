package com.dxckie.mahiro

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.InputStream

/** Files packed into the plugin jar under resources/mahiro/ (see the root build.gradle.kts, dexJar). */
internal fun resource(name: String): InputStream? = Script::class.java.classLoader?.getResourceAsStream("mahiro/$name")

internal object Sprites {
	private var bitmaps: List<Bitmap> = emptyList()
	private var boxes: List<FloatArray> = emptyList()
	private var loadedFor = 0
	private val defaultBox = floatArrayOf(0.11f, 0.09f, 0.89f, 0.90f)

	fun get(index: Int): Bitmap? = bitmaps.getOrNull(index)

	/** Where the drawn body sits in sprite [index]: left, top, right, bottom as fractions of its size. */
	fun box(index: Int): FloatArray = boxes.getOrNull(index) ?: defaultBox

	private fun measure(b: Bitmap): FloatArray {
		val w = b.width
		val h = b.height
		val px = IntArray(w * h)
		b.getPixels(px, 0, w, 0, 0, w, h)
		var l = w
		var t = h
		var r = -1
		var bt = -1
		for (yy in 0 until h) for (xx in 0 until w) {
			if ((px[yy * w + xx] ushr 24) > 24) {
				if (xx < l) l = xx
				if (xx > r) r = xx
				if (yy < t) t = yy
				if (yy > bt) bt = yy
			}
		}
		if (r < 0) return defaultBox
		return floatArrayOf(l / w.toFloat(), t / h.toFloat(), (r + 1) / w.toFloat(), (bt + 1) / h.toFloat())
	}

	/** Decodes the 512 px sprites at the biggest power-of-two reduction that still covers [targetPx]. */
	fun load(targetPx: Int) {
		if (bitmaps.isNotEmpty() && loadedFor == targetPx) return
		var sample = 1
		while (512 / (sample * 2) >= targetPx) sample *= 2
		val opts = BitmapFactory.Options().apply { inSampleSize = sample }
		val out = ArrayList<Bitmap>()
		for (i in 0 until 256) {
			val stream = resource("sprites/%04d.webp".format(i)) ?: break
			val bmp = stream.use { BitmapFactory.decodeStream(it, null, opts) } ?: break
			// Drawn 1:1, so the GPU never has to resample a 512 px sprite for every frame.
			val fitted = if (bmp.width == targetPx) bmp else Bitmap.createScaledBitmap(bmp, targetPx, targetPx, true)
			if (fitted !== bmp) bmp.recycle()
			out.add(fitted)
		}
		bitmaps = out
		boxes = out.map { measure(it) }
		loadedFor = targetPx
	}
}
