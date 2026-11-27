package com.dxckie.mahiro

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import java.io.InputStream

/** Files packed into the plugin jar under resources/mahiro/ (see the root build.gradle.kts, dexJar). */
internal fun resource(name: String): InputStream? = Script::class.java.classLoader?.getResourceAsStream("mahiro/$name")

internal object Sprites {
	private var bitmaps: List<Bitmap> = emptyList()
	private var loadedFor = 0

	fun get(index: Int): Bitmap? = bitmaps.getOrNull(index)

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
			out.add(bmp)
		}
		bitmaps = out
		loadedFor = targetPx
	}
}
