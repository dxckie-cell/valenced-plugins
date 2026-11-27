import java.io.File

pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositories {
        // The Valenced API, built from source by scripts/build-native.sh.
        mavenLocal {
            content { includeGroup("app.valenced") }
        }
        google()
        mavenCentral()
        // Xposed API (provided by the framework at runtime).
        maven(url = "https://api.xposed.info/")
    }
}

rootProject.name = "dxckie-valenced-plugins"

// Each plugins/<name>/ folder with Kotlin sources (src/main) is a native plugin module.
file("plugins").listFiles()
    ?.filter { it.isDirectory && File(it, "src/main").isDirectory }
    ?.sortedBy { it.name }
    ?.forEach { include(":plugins:${it.name}") }
