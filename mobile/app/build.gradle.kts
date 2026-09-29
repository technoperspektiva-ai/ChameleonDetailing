plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val appUrl = providers.gradleProperty("CHAMELEON_APP_URL")
    .orElse("https://chameleondetailing.black-sci-official.workers.dev")
val googleServerClientId = providers.gradleProperty("GOOGLE_SERVER_CLIENT_ID")
    .orElse("")

android {
    namespace = "com.chameleondetailing.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.chameleondetailing.app"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "1.0.0"
        buildConfigField("String", "APP_URL", "\"${appUrl.get()}\"")
        buildConfigField("String", "GOOGLE_SERVER_CLIENT_ID", "\"${googleServerClientId.get()}\"")
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            val keystorePath = providers.gradleProperty("CHAMELEON_KEYSTORE_PATH").orNull
            if (!keystorePath.isNullOrBlank()) {
                signingConfig = signingConfigs.create("release") {
                    storeFile = file(keystorePath)
                    storePassword = providers.gradleProperty("CHAMELEON_KEYSTORE_PASSWORD").orNull
                    keyAlias = providers.gradleProperty("CHAMELEON_KEY_ALIAS").orNull
                    keyPassword = providers.gradleProperty("CHAMELEON_KEY_PASSWORD").orNull
                }
            }
        }
    }

    buildFeatures { buildConfig = true }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin { jvmToolchain(17) }

dependencies {
    implementation(project(":shared"))
    implementation("androidx.core:core-ktx:1.19.1")
    implementation("androidx.activity:activity-ktx:1.13.0")
    implementation("androidx.appcompat:appcompat:1.8.0")
    implementation("androidx.browser:browser:1.10.0")
    implementation("androidx.webkit:webkit:1.16.0")
    implementation("androidx.security:security-crypto:1.1.0")
    implementation("androidx.credentials:credentials:1.6.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.6.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.2.1")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.11.0")
}
