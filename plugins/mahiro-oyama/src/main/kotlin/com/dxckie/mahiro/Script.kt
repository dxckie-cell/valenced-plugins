package com.dxckie.mahiro

import org.json.JSONArray
import org.json.JSONObject

internal enum class Border { LEFT, RIGHT, TOP, BOTTOM }

internal class Frame(val sprite: Int, val dx: Float, val dy: Float, val ticks: Int)

internal class Choice(val to: String, val weight: Float, val facing: String?)

/** One rule from animation.json: a border transition (event == null) or an event transition. */
internal class Transition(
	val event: String?,
	val from: String?,
	val whenBorder: Border?,
	val facing: String?,
	val allowedTypes: Set<String>?,
	val choices: List<Choice>,
)

internal class Move(
	val key: String,
	val type: String,
	val subtype: String,
	val loop: Boolean,
	val frames: List<Frame>,
	val hasAuto: Boolean,
	val minTicks: Int,
	val maxTicks: Int,
	val onFinish: List<Choice>,
	val borders: List<Transition>,
	val events: List<Transition>,
)

/** The Shimeji app's "pc_import_v1" animation graph, read from resources/mahiro/animation.json. */
internal class Script(val default: String, val initial: List<String>, val moves: Map<String, Move>, val events: List<Transition>) {
	companion object {
		fun parse(text: String): Script {
			val root = JSONObject(text)
			val moves = LinkedHashMap<String, Move>()
			val animations = root.getJSONArray("animations")
			for (i in 0 until animations.length()) {
				val a = animations.getJSONObject(i)
				val frames = a.getJSONArray("frames").objects().map {
					Frame(it.getInt("sprite"), it.optDouble("dx", 0.0).toFloat(), it.optDouble("dy", 0.0).toFloat(), it.optInt("durationTicks", 1).coerceAtLeast(1))
				}
				val auto = a.optJSONObject("auto")
				val max = auto?.optJSONObject("maxDurationTicks")
				val key = a.getString("key")
				moves[key] = Move(
					key = key,
					type = a.optString("type"),
					subtype = a.optString("subtype"),
					loop = a.optString("loop") == "LOOP",
					frames = frames,
					hasAuto = auto != null,
					minTicks = max?.optInt("minTicks", 0) ?: 0,
					maxTicks = max?.optInt("maxTicks", 0) ?: 0,
					onFinish = choices(auto?.optJSONArray("onFinish")),
					borders = (a.optJSONArray("borderTransitions")?.objects() ?: emptyList()).map { transition(it, null) },
					events = (a.optJSONArray("eventTransitions")?.objects() ?: emptyList()).map { transition(it, it.optString("event")) },
				)
			}
			val initial = root.optJSONArray("initial_candidates")?.let { arr -> List(arr.length()) { arr.getString(it) } } ?: emptyList()
			return Script(
				default = root.optString("default_animation", "fall"),
				initial = initial.filter { it in moves },
				moves = moves,
				events = (root.optJSONArray("events")?.objects() ?: emptyList()).map { transition(it, it.optString("event")) },
			)
		}

		private fun JSONArray.objects(): List<JSONObject> = List(length()) { getJSONObject(it) }

		private fun choices(arr: JSONArray?): List<Choice> = (arr?.objects() ?: emptyList()).map {
			Choice(it.getString("to"), it.optDouble("weight", 1.0).toFloat(), it.optString("setFacing", "").ifEmpty { null })
		}

		private fun transition(o: JSONObject, event: String?) = Transition(
			event = event,
			from = o.optString("from", "").ifEmpty { null },
			whenBorder = o.optString("when", "").let { w -> Border.entries.firstOrNull { it.name == w } },
			facing = o.optString("facing", "").ifEmpty { null },
			allowedTypes = o.optJSONArray("allowedTypes")?.let { arr -> List(arr.length()) { arr.getString(it) }.toSet() },
			choices = choices(o.optJSONArray("choices")),
		)
	}
}
