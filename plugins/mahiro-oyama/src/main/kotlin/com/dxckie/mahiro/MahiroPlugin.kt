@file:JvmName("MahiroPlugin")

package com.dxckie.mahiro

import app.valenced.plugins.plugin
import app.valenced.xposed.api.registerNativeMethod
import org.json.JSONObject
import java.io.File

/** Native owns the settings; the JS settings page reads and writes them through native methods. */
internal object Settings {
	@Volatile var show = true
	/** Pet size in dp. */
	@Volatile var sizeDp = 96
	/** Movement speed in percent. */
	@Volatile var speed = 100
	@Volatile var haptics = true
}

val mahiroPlugin = plugin {
	start {
		val file = File(storageDir, "settings.json")
		if (file.exists()) {
			runCatching {
				val json = JSONObject(file.readText())
				Settings.show = json.optBoolean("show", true)
				Settings.sizeDp = json.optInt("sizeDp", 96).coerceIn(40, 200)
				Settings.speed = json.optInt("speed", 100).coerceIn(25, 300)
				Settings.haptics = json.optBoolean("haptics", true)
			}.onFailure { log.w("could not read settings: ${it.message}") }
		}

		fun current() = mapOf(
			"show" to Settings.show,
			"sizeDp" to Settings.sizeDp,
			"speed" to Settings.speed,
			"haptics" to Settings.haptics,
		)

		mainHandler.post { runCatching { Pet.start() }.onFailure { log.e("start failed: ${it.message}") } }

		registerNativeMethod("${manifest.id}.getSettings") { _ -> current() }
		registerNativeMethod("${manifest.id}.setSettings") { args ->
			val patch = args.firstOrNull() as? Map<*, *> ?: emptyMap<Any, Any>()
			val showBefore = Settings.show
			val sizeBefore = Settings.sizeDp
			val speedBefore = Settings.speed
			(patch["show"] as? Boolean)?.let { Settings.show = it }
			(patch["sizeDp"] as? Number)?.let { Settings.sizeDp = it.toInt().coerceIn(40, 200) }
			(patch["speed"] as? Number)?.let { Settings.speed = it.toInt().coerceIn(25, 300) }
			(patch["haptics"] as? Boolean)?.let { Settings.haptics = it }
			runCatching {
				file.writeText(
					JSONObject()
						.put("show", Settings.show)
						.put("sizeDp", Settings.sizeDp)
						.put("speed", Settings.speed)
						.put("haptics", Settings.haptics)
						.toString(),
				)
			}.onFailure { log.w("could not save settings: ${it.message}") }
			mainHandler.post {
				runCatching {
					if (Settings.show != showBefore) {
						if (Settings.show) Pet.start() else Pet.stopNow()
					} else if (Settings.sizeDp != sizeBefore || Settings.speed != speedBefore) {
						Pet.resize()
					}
				}.onFailure { log.e("applying settings failed: ${it.message}") }
			}
			current()
		}
		registerNativeMethod("${manifest.id}.recenter") { _ ->
			mainHandler.post { runCatching { Pet.recenter() } }
			true
		}
	}

	stop {
		mainHandler.post { runCatching { Pet.stopNow() } }
	}
}
