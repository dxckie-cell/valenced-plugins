import com.android.build.api.dsl.LibraryExtension
import com.android.build.api.variant.LibraryAndroidComponentsExtension
import java.io.File
import java.nio.file.FileSystems
import java.nio.file.Files
import java.util.concurrent.Callable
import javax.inject.Inject
import org.gradle.process.ExecOperations
import org.jetbrains.kotlin.gradle.dsl.KotlinAndroidProjectExtension

plugins {
    alias(libs.plugins.android.library) apply false
    alias(libs.plugins.kotlin.android) apply false
}

val compileSdkVer = libs.versions.compileSdk.get()
val minSdkVer = libs.versions.minSdk.get()
val javaVer = libs.versions.javaVersion.get()
val valencedApiDep = libs.valenced.api.get().toString()
val xposedApiDep = libs.xposed.api.get().toString()
val coroutinesDep = libs.kotlinx.coroutines.android.get().toString()
val androidLibraryPluginId = libs.plugins.android.library.get().pluginId

// Gradle 9 removed Project.exec from task actions
interface ExecOpsProvider {
    @get:Inject val execOps: ExecOperations
}

tasks.register<Delete>("clean") {
    group = "build"
    delete(layout.buildDirectory)
}

val cleanTasks = Callable { rootProject.allprojects.mapNotNull { it.tasks.findByName("clean") } }

// Native plugin modules (:plugins:<name>) are configured from here, so a native plugin needs
// nothing but src/main and a manifest.json. `./gradlew dexJar` leaves
// plugins/<name>/build/outputs/plugin/plugin.jar, which scripts/build-native.sh copies to prebuilt/.
configure(subprojects.filter { it.path.startsWith(":plugins:") }) {
    pluginManager.apply(androidLibraryPluginId)

    extensions.configure<LibraryExtension> {
        namespace = "valenced.plugin." + name.replace(Regex("[^A-Za-z0-9]"), "_")
        compileSdk = compileSdkVer.toInt()
        defaultConfig { minSdk = minSdkVer.toInt() }
        compileOptions {
            sourceCompatibility = JavaVersion.toVersion(javaVer)
            targetCompatibility = JavaVersion.toVersion(javaVer)
        }
        sourceSets {
            named("main") { kotlin.directories += "src/main/kotlin" }
        }
    }

    extensions.configure<KotlinAndroidProjectExtension> {
        jvmToolchain(javaVer.toInt())
    }

    // AGP's lint tasks need a module build.gradle, which these script-less modules don't have.
    tasks.configureEach {
        if (name.contains("Lint") || name.startsWith("lint")) enabled = false
    }

    dependencies {
        // Provided at runtime by the host, so never bundled
        add("compileOnly", valencedApiDep)
        add("compileOnly", xposedApiDep)
        add("compileOnly", coroutinesDep)
    }

    val androidExt = extensions.getByType<LibraryExtension>()
    val sdkDirProvider = extensions.getByType<LibraryAndroidComponentsExtension>().sdkComponents.sdkDirectory
    val execOps = objects.newInstance<ExecOpsProvider>().execOps

    tasks.register("dexJar") {
        group = "valenced"
        description = "Compiles this plugin into a DEX-containing JAR loadable by DexClassLoader."
        dependsOn("compileReleaseKotlin", "compileReleaseJavaWithJavac")
        mustRunAfter(cleanTasks)

        // Only this module's own classes are DEXed. Dependencies are compileOnly.
        val classDirs = files(
            layout.buildDirectory.dir("intermediates/built_in_kotlinc/release/compileReleaseKotlin/classes"),
            layout.buildDirectory.dir("tmp/kotlin-classes/release"),
            layout.buildDirectory.dir("intermediates/javac/release/classes"),
        )
        inputs.files(classDirs).withPropertyName("classDirs").optional()

        // Java resources are packaged as-is, so the plugin reads them through its class loader.
        val resources = fileTree("src/main/resources")
        inputs.files(resources).withPropertyName("resources").optional()

        val outJar = layout.buildDirectory.file("outputs/plugin/plugin.jar")
        outputs.file(outJar).withPropertyName("dexJar")

        val buildToolsVersion = androidExt.buildToolsVersion

        doLast {
            val classFiles = classDirs.asFileTree.matching { include("**/*.class") }.files
            if (classFiles.isEmpty()) error("No compiled classes found to dex in $path.")

            val sdkDir = sdkDirProvider.get().asFile
            // Newest d8: the AGP-default build-tools could be too old for a newer toolchain's class files.
            val d8 = File(sdkDir, "build-tools").listFiles()
                ?.sortedByDescending(File::getName)
                ?.map { File(it, "d8") }
                ?.firstOrNull(File::isFile)
                ?: file("$sdkDir/build-tools/$buildToolsVersion/d8")
            val androidJar = file("$sdkDir/platforms/android-$compileSdkVer/android.jar")
            require(d8.exists()) { "d8 not found at $d8" }
            require(androidJar.exists()) { "android.jar not found at $androidJar" }

            val out = outJar.get().asFile
            out.parentFile.mkdirs()
            execOps.exec {
                commandLine(
                    d8.absolutePath,
                    "--min-api", minSdkVer,
                    "--lib", androidJar.absolutePath,
                    "--output", out.absolutePath,
                    *classFiles.map { it.absolutePath }.toTypedArray(),
                )
            }

            if (!resources.isEmpty) {
                FileSystems.newFileSystem(out.toPath()).use { jar ->
                    resources.visit {
                        val target = jar.getPath(relativePath.pathString)
                        if (isDirectory) Files.createDirectories(target)
                        else Files.copy(file.toPath(), target)
                    }
                }
            }

            logger.lifecycle("Dexed $path -> ${out.relativeTo(rootProject.projectDir)}")
        }
    }
}
