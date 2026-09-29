plugins {
    id("org.jetbrains.kotlin.multiplatform")
    id("com.android.library")
}
kotlin {
    androidTarget()
    iosX64()
    iosArm64()
    iosSimulatorArm64()
    sourceSets {
        commonMain.dependencies {}
        commonTest.dependencies { implementation(kotlin("test")) }
    }
}
android {
    namespace = "com.chameleondetailing.shared"
    compileSdk = 36
    defaultConfig { minSdk = 26 }
}
