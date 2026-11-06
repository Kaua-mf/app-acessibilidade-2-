allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
    // camera-core 1.5.x references androidx.concurrent.futures.CallbackToFutureAdapter;
    // make it available to every plugin subproject's compile classpath once the
    // Android base plugin (which creates the 'implementation' configuration) is applied.
    project.plugins.withId("com.android.base") {
        project.dependencies.add("implementation", "androidx.concurrent:concurrent-futures:1.1.0")
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
