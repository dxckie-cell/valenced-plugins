package com.dxckie.mahiro

import android.content.res.Resources
import android.os.Handler
import android.os.Looper
import android.view.View

internal val mainHandler = Handler(Looper.getMainLooper())

internal fun dp(value: Float): Float = value * Resources.getSystem().displayMetrics.density

/** The hidden `WindowManagerGlobal.mViews`: every window root in this process (same trick Capri uses). */
private val mViewsField by lazy {
	runCatching {
		val cls = Class.forName("android.view.WindowManagerGlobal")
		val instance = cls.getMethod("getInstance").invoke(null)
		val field = cls.getDeclaredField("mViews").apply { isAccessible = true }
		instance to field
	}.getOrNull()
}

internal fun windowRoots(): List<View> {
	val (instance, field) = mViewsField ?: return emptyList()
	val views = runCatching { (field.get(instance) as List<*>).toList() }.getOrNull() ?: return emptyList()
	return views.filterIsInstance<View>().filter { it.isAttachedToWindow && it.width > 0 }
}
