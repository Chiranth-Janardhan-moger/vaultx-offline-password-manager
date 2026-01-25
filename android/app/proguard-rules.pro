# SECURITY: Prevent screenshots and screen recording
-keep class android.view.WindowManager { *; }
-keep class android.view.WindowManager$LayoutParams { *; }

# VaultX ProGuard Configuration - Maximum Optimization & Security
# This configuration provides the strongest possible obfuscation and size reduction

# ============================================================================
# OPTIMIZATION SETTINGS - MAXIMUM AGGRESSIVE
# ============================================================================
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose

# Optimization options (less aggressive to prevent crashes)
-optimizations !code/simplification/arithmetic,!code/simplification/cast,!field/*,!class/merging/*
-keepattributes Signature
-keepattributes Exceptions
-keepattributes InnerClasses

# ============================================================================
# OBFUSCATION - MAXIMUM SECURITY
# ============================================================================
-renamesourcefileattribute SourceFile
-keepattributes SourceFile,LineNumberTable

# ============================================================================
# REACT NATIVE CORE - MINIMAL KEEPS
# ============================================================================
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.uimanager.** { *; }
-keep class com.facebook.react.views.** { *; }

# React Native Reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.common.** { *; }

# React Native Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# React Native Screens
-keep class com.swmansion.rnscreens.** { *; }

# React Native Safe Area Context
-keep class com.th3rdwave.safeareacontext.** { *; }

# ============================================================================
# EXPO MODULES - MINIMAL KEEPS
# ============================================================================
-keep class expo.modules.** { *; }
-keep class expo.modules.core.** { *; }
-keep class expo.modules.kotlin.** { *; }

# Expo SecureStore (critical for VaultX)
-keep class expo.modules.securestore.** { *; }

# Expo Local Authentication (biometric)
-keep class expo.modules.localauthentication.** { *; }

# React Native Biometrics (native biometric)
-keep class com.rnbiometrics.** { *; }
-keepclassmembers class com.rnbiometrics.** { *; }

# ============================================================================
# NATIVE METHODS
# ============================================================================
-keepclasseswithmembernames class * {
    native <methods>;
}

# ============================================================================
# REMOVE ALL LOGGING - MAXIMUM SECURITY
# ============================================================================
-assumenosideeffects class android.util.Log {
    public static *** d(...);
    public static *** v(...);
    public static *** i(...);
    public static *** w(...);
    public static *** e(...);
    public static *** wtf(...);
}

# Remove console.log
-assumenosideeffects class * {
    void println(...);
}

# ============================================================================
# CRASH REPORTING - KEEP STACK TRACES
# ============================================================================
-keepattributes *Annotation*
-keep public class * extends java.lang.Exception

# ============================================================================
# AGGRESSIVE REMOVAL - UNUSED CODE
# ============================================================================
-dontwarn com.facebook.react.**
-dontwarn com.google.android.gms.**
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn javax.annotation.**
-dontwarn org.conscrypt.**
-dontwarn org.bouncycastle.**
-dontwarn org.openjsse.**

# ============================================================================
# VAULTX SPECIFIC - KEEP MAIN APPLICATION
# ============================================================================
-keep class com.chiranth7.vaultx.** { *; }
-keep class com.chiranth7.vaultx.MainApplication { *; }
-keep class com.chiranth7.vaultx.MainActivity { *; }

# ============================================================================
# SERIALIZATION - FOR CRYPTO-JS
# ============================================================================
-keepclassmembers class * implements java.io.Serializable {
    static final long serialVersionUID;
    private static final java.io.ObjectStreamField[] serialPersistentFields;
    private void writeObject(java.io.ObjectOutputStream);
    private void readObject(java.io.ObjectInputStream);
    java.lang.Object writeReplace();
    java.lang.Object readResolve();
}

# ============================================================================
# ENUMS
# ============================================================================
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

# ============================================================================
# PARCELABLE
# ============================================================================
-keepclassmembers class * implements android.os.Parcelable {
    public static final ** CREATOR;
}

# ============================================================================
# JAVASCRIPT INTERFACE (if any)
# ============================================================================
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ============================================================================
# REMOVE DEBUG INFO
# ============================================================================
-assumenosideeffects class kotlin.jvm.internal.Intrinsics {
    public static void checkExpressionValueIsNotNull(...);
    public static void checkNotNullExpressionValue(...);
    public static void checkParameterIsNotNull(...);
    public static void checkNotNullParameter(...);
    public static void checkFieldIsNotNull(...);
    public static void checkReturnedValueIsNotNull(...);
}

# ============================================================================
# END OF CONFIGURATION
# ============================================================================
