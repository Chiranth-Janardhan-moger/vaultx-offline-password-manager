# VaultX 

You are tasked with building a complete, high-fidelity clone of **VaultX**, a secure, 100% offline password manager built with **Expo (React Native)** and **TypeScript**. It utilizes native Android extensions for clipboard monitoring, screenshot blocking, and system-wide autofill integration.

Follow the styling guidelines, file specs, and exact code implementations below to recreate the application.

---

## 1. Cryptographic Setup & Architecture

### A. Key Derivation & Encryption Specs
1. **Master Encryption Key**: On setup, generate a secure random 32-byte hex string using `expo-crypto` (`generateVaultKey()`). This key is never stored in plaintext.
2. **Wrapper Storage System (`SecureStore`)**:
   - Derive wrap keys using PBKDF2 (1000 iterations for performance on mobile, using SHA-256 via CryptoJS) with unique random salts (16-byte hex).
   - Wrap the main vault key using AES-256 (`CryptoJS.AES.encrypt`).
   - Store the salt and wrapped key in `SecureStore` for:
     - Master Password wrapper (key: `vault_wrap_password_v1`)
     - 6-Digit Verification PIN wrapper (key: `vault_wrap_pin_v1`)
     - Security Question Q&A wrapper (key: `vault_wrap_recovery_v1`, answers normalized: lowercased, whitespace removed, joined by `|`).
3. **Biometric Decryption Wrapper**:
   - Use `react-native-biometrics` to generate a device key pair (`createKeys()`).
   - Store the vault key directly inside `SecureStore` (key: `vault_key_bio_v1`). SecureStore handles system-level biometric protection.
   - Maintain a biometric activation state boolean inside SecureStore (key: `vault_bio_enabled_v1`).
4. **Data File Encryption (`FileSystem`)**:
   - Maintain the vault structure containing user meta (phone number, hashed password) and an array of `PasswordItem` objects.
   - Encrypt the JSON data using AES-256 with the master vault key, and write it to `FileSystem.documentDirectory` under the filename `vault_v1.enc`.

---

## 2. Design System & Theme Layout Tokens

Create a unified theme system inside `context/ThemeProvider.tsx` and wrap layouts in `components/Screen.tsx`.

### A. Visual Theme Mappings
- **Light Theme Modes**:
  - Background: `#ffffff`
  - Card background: `#f3f4f6`
  - Primary / Buttons / Highlights: `#2563EB`
  - Text: `#0b0b0c`, Muted text: `#4b5563`
  - Input field background: `#eef2f7`, Borders: `#e5e7eb`
- **Dark Theme Modes**:
  - Background: `#0b0b0c`
  - Card background: `#111827`
  - Primary / Buttons / Highlights: `#2563EB`
  - Text: `#ffffff`, Muted text: `#9aa0a6`
  - Input field background: `#1f2937`, Borders: `#1f2937`
- **Enhanced Contrast Layout Override (High Contrast)**:
  - Triggered by `enhancedContrast` boolean toggle in settings.
  - Active: backgrounds render on pure `#000000` (Dark) or pure `#ffffff` (Light).
  - Borders override: if `showBorders` toggle is active, cards/inputs render a solid 1.5px border colored `#ffffff` (Dark) or `#000000` (Light).

### B. Typography & Components
- Font Weights: Heavy headers (`fontWeight: '900'` / `'800'`), subtitles (`fontWeight: '600'`), monospace outputs.
- **CustomAlert Component (`components/CustomAlert.tsx`)**:
  - Custom overlay Alert dialog containing title, message, cancelText, confirmText, type (info/destructive), onConfirm and onCancel handlers.
  - Animations: background modal overlay fades to opacity `0.6`. Dialogue box uses spring animations to scale from `0.8` to `1.0`.
  - Export custom hook `useCustomAlert()` returning `showAlert`, `hideAlert`, and `<AlertComponent />`.
- **Safe Area Page Wrap (`components/Screen.tsx`)**:
  - Safe area container mapping status bar colors dynamically.
  - Interacts with `expo-navigation-bar` using `NavigationBar.setButtonStyleAsync()` to set system buttons styles matching theme shifts.

---

## 3. Session & Global State Provider Configurations

### A. Application Stack Layout (`app/_layout.tsx`)
- Splash screen visibility maintained via `SplashScreen.preventAutoHideAsync()`.
- Top-level providers wrap all navigation pages: `ThemeProvider` -> `SessionProvider`.
- Navigator Stack config: `headerShown: false`, animations `'slide_from_right'` (200ms duration), gesture navigation enabled. Android utilizes `'fade_from_bottom'` (180ms duration).
- Global Listeners on mount:
  - Applies native screen blocker (`setScreenshotBlocking(true)`) by checking SecureStore key `block_screenshots` (defaults to true if unset).
  - Initializes native clipboard monitor listeners (`startClipboardMonitoring()`) on start and cleans them up (`stopClipboardMonitoring()`) on unmount.

### B. Session Provider State (`context/SessionProvider.tsx`)
- Exposes session variables: `unlocked`, `vault`, `vaultKey`, `unlock()`, `lock()`, `setVault()`, and `resetAutoLockTimer()`.
- Auto-Lock Timer thread:
  - Fetches configuration from SecureStore key `auto_lock_timer` (minutes duration value, e.g. 0/disabled, 1, 5, 10, 30).
  - Listens to React Native `AppState` hook status.
  - App backgrounded/inactive: records background time timestamp `lastActiveTimeRef.current = Date.now()` and clears local timers.
  - App active (foreground): computes elapsed background duration (`Date.now() - lastActiveTimeRef.current`). If it surpasses setting limits, sets `vault` and `vaultKey` states to `null` and redirects to `/login`. If within limits, restarts the timer with remaining offset.

---

## 4. File-by-File Detailed Screen & UI Specifications

### A. Initialization splasher (`app/index.tsx`)
- Logic check: invokes `vaultExists()` checking for local database `vault_v1.enc`.
- Redirect route: pushes user to `/login` if file exists; otherwise pushes to `/onboarding`. Hide splash screen afterwards.

### B. Onboarding Walkthrough (`app/onboarding.tsx`)
- Slide dimensions: full-width (`Dimensions.get('window').width`) slideshow container displaying:
  1. *Military-Grade Security*: AES-256 encryption specs (Ionicon: `shield-checkmark`, color: `#22c55e`).
  2. *100% Offline*: No internet connection requirement, 100% private (Ionicon: `lock-closed`, color: `#3b82f6`).
  3. *Complete Privacy*: Blocked screenshots details (Ionicon: `eye-off`, color: `#8b5cf6`).
  4. *Biometric Protection*: fingerprint setup descriptions (Ionicon: `finger-print`, color: `#f59e0b`).
- Animations: slide shifts fade-in (opacity timing `0` to `1`) and slide upwards (translateY transition `50` to `0` using vertical spring). Includes a skip button linking to `/setup`.

### C. Multi-Step Configuration Setup (`app/setup.tsx`)
- Visual wizard rendering steps 0-3 with dot indicators:
  - **Account Setup (Step 0)**: Input fields for user phone and password confirmation.
    - Password Strength Evaluation: computes score (0-4) checking numbers, capitals, symbols, and length. Renders a color-coded percentage status track under input box (Red: Weak, Orange: Fair, Yellow: Good, Green: Strong).
  - **Security Q&A Recovery (Step 1)**: Selector dropdown presenting 6 questions:
    - *'What is your pet\'s name?'*
    - *'What is your favorite dish/food?'*
    - *'What city were you born in?'*
    - *'What is your mother\'s maiden name?'*
    - *'What was the name of your first school?'*
    - *'What is your favorite movie?'*
    - Selection opens a pop-up picker card overlay showing questions grid. Save normalizes inputs to lowercase space-stripped strings.
  - **VPin Setup (Step 2)**: Visual track of 6 PIN digits boxes. Tapping triggers hidden TextInput (number-pad). Filled digits render `●`. Highlights current box. Pushes confirm pin step.
  - **Biometrics Setup (Step 3)**: Auto-checks device sensor availability (`react-native-biometrics`). Switch toggle to activate biometric credentials database storage.
- Save encrypts credentials, creates empty vault structure, and pushes route to `/dashboard`.

### D. Login Authentication Screen (`app/login.tsx`)
- **Pulsing Radial Glow & Rotating Lock Badge**:
  - Center shield lock badge container (`width/height: 140`, `borderRadius: 70`, card background, shadow, thin border) holding an Ionicon `lock-closed` (size 56, primary color).
  - Pulsing glow: Behind lock container, a `LinearGradient` circle overlay (`width/height: 180`, `borderRadius: 90`, primary color opacity `0.3` to `0.8`) pulsates slowly using timing animation loop (2000ms duration per direction).
  - Rotation loop: Lock badge container rotates from `-5deg` to `5deg` continuously (looping sequence, 3000ms per direction).
- **Floating Particles Background**:
  - 3 background circle nodes drifting translate translateY:
    - Particle 1: `width/height: 100`, top `10%`, left `10%`, drifts translateY `0` to `-30` (duration 4000ms).
    - Particle 2: `width/height: 80`, top `70%`, right `15%`, drifts translateY `0` to `40` (duration 4000ms).
    - Particle 3: `width/height: 60`, top `40%`, right `10%`, drifts translateY `0` to `-20` (duration 4000ms).
- **Labels Layout**: Title text "Welcome Back" (`fontSize: 32`, `fontWeight: '900'`), Subtitle "Unlock your vault to continue" (`fontSize: 15`).
- **Interactive PIN Boxes**:
  - Row of 6 square boxes (`width: 52`, `height: 64`, `borderRadius: 16`, `borderWidth: 2`). Active box applies `borderWidth: 2.5` primary color border, shadow opacity 0.3, elevation 4.
  - Digit state: filled boxes display a secure dot `●`.
  - hidden text input focused via tapping any box (keyboardType: number-pad, maxLength: 6).
  - Fail animation: incorrect PIN inputs trigger a horizontal shake sequence (`-10` to `10` to `-10` to `0` translations over 200ms) and clear inputs.
  - Login Lockout: after 5 consecutive failed attempts, disables login inputs for 30 seconds.
- **Biometric Action Button**:
  - Renders below PIN boxes if biometrics are enabled. Card wrapper (`borderWidth: 1.5`, card background) enclosing a `LinearGradient` background (primary opacity `15%` to `5%`). Contains `finger-print` Ionicon (size 28, primary color) and text "Use Biometric" (`fontSize: 16`, `fontWeight: '800'`). Tapping invokes simple prompt sensor.
- **Footer Navigation**: Links to `/unlock-password` ("Forgot PIN? Use password →").

### E. Dashboard Screen (`app/dashboard.tsx`)
- **Header Structure**:
  - Left layout: Title "VaultX" (`fontSize: 26`, `fontWeight: '900'`) and masked phone text (`12XXXXXX34`).
  - Right layouts: Search button and Settings button inside bordered card icons.
  - **Double-Tap Lock**: Tapping empty dashboard scroll view elements or header within 300ms invokes `lock()` session clearance and routes to `/login`.
- **Category Grid**:
  - Cards displaying the 8 categories. Lists item counts in each category. Pushes route to `/category/[id]`.
- **Dual-Action Floating Action Button (FAB)**:
  - Bottom-right FAB button (plus icon). Tapping rotates the button (`135deg`) and shows a dark backdrop backdrop.
  - Displays slide-up card layout showing options:
    1. *Save Existing Passwords* (Ionicon `key`, primary color, opens `/add`).
    2. *Generate New Password* (Ionicon `sparkles`, purple background, opens `/generate-password`; prompts user if master password is unset).
- **Typewriter Spotlight Tutorial**:
  - First-time launch overlay highlighting the two FAB options inside highlighted spotlight circles.
  - Typewriter anim writes tutorials (1 char per 30ms interval):
    - *Option 1*: `"Keep your existing passwords safe and organized — no need to remember them."`
    - *Option 2*: `"Create strong, secure passwords automatically."`

### F. Save & Edit Password Forms (`app/add.tsx` & `app/edit/[index].tsx`)
- **Form Layout Fields**:
  - Website name input: typing suggest suggestions chips below (e.g. typing "ig" suggest "Instagram" sparkles badge).
  - Username input field (mandatory).
  - Password field: optional *only* if at least one numeric PIN is configured in keypad layouts; else mandatory. Contains eye toggle button.
  - Notes field: multiline input card wrapper.
  - Strength progress bar visualizer.
- **Keypad PIN layouts Section**:
  - Toggled via keypad icon button "Add PINs (Banking/UPI)".
  - Rounded text inputs for Login PIN and Transaction PIN.
  - Dynamic Custom PIN rows: "Add Another PIN" appends container card showing label input, PIN input, eye visibility toggler, and remove trash icon button.
- **Keywords Classification**:
  - Saving auto-categorizes entries into correct category mapping based on service name matching keywords.

### G. Deterministic Password Generator (`app/generate-password.tsx`)
- Setup checking: blocks generation and prints alert badge redirecting to `/master-password-intro` if master password is not configured in SecureStore.
- Monospace copy card displaying username, service name, notes pre-filled with `"Generated with Master Password"`, and deterministic output generated using master password SHA-256 hex splits algorithm.

### H. Search & Filtering Screen (`app/search.tsx`)
- Top dedicated search input bar highlighting matching query strings.
- Favorites filter chip: star icon badge filtering display to starred items (`isFavorite: true`).
- Horizontal list slider of category filter chips restricting results to chosen category.
- Stored history list of last 5 search terms, with a clear history utility.

### I. Category Details list (`app/category/[id].tsx`)
- Top gradient title layout matching selected category styles.
- FlatList of expandable items accordion cards:
  - Expanded details show username, copy buttons, password toggle eyes, notes, timestamps ("Added 2h ago").
  - **Inline keypad options**: UPI/login PIN rows render matching key badges.
  - **Long-Press replacement Options**: long-pressing an item replaces right-hand chevrons with Move Category, Edit, and Delete action buttons.
  - Move Category action prompts a slide-up category grid modal to sort details into alternative category blocks.

### J. Settings & Configurations Page (`app/settings.tsx`)
- General: Block Screenshots toggles, Double-Tap Lock toggle, Auto-Lock timers picker overlay.
- Theme overrides: Contrast settings, borders override switches, Dark/Light modes toggles.
- Backup tools: Recovery Questions preview, Export databases, import back files.
- About section: Wipe data utility.

### K. Credential Verification Override (`app/unlock-password.tsx`)
- Visual Header: `key` Ionicon container box, phone number masked identifier, title "Unlock with Password".
- Form: Enter password text input with toggle eye button. Full-width primary button labeled "Unlock".
- Logic:
  - Takes input, derives PBKDF2 wrap keys, decrypts vault database `vault_v1.enc`.
  - Integrates failed attempt locks: after 5 consecutive failures, blocks screen inputs and counts down 30 seconds.
  - recovery redirection link to `/recover`.

### L. Credential Modification Pages
- **Change Password (`app/change-password.tsx`)**:
  - Back action header card.
  - PIN visual keypad: displays 6 square digit blocks for current VPin authentication. Fills digits with dots `●`. Focuses hidden numeric keyboard.
  - Inputs for "New Password" and "Confirm New Password" with eye toggle badges.
  - Action: Verifies PIN matches, overrides vault hash meta parameters, saves updated wrappers to SecureStore.
- **Change VPin (`app/change-vpin.tsx`)**:
  - Input field verifying current account password.
  - Two rows of 6 visual PIN digit tracks: "New VPin" and "Confirm New VPin" with custom focused highlights. Saves updated VPin wrapper configurations.

### M. Security Question Recovery (`app/recover.tsx`)
- Icon badge showing a help icon, header text "Recovery".
- Loads current questions from SecureStore recovery records.
- Normalized Answer Check:
  - User answers text input. Normalization turns input lowercase and removes all whitespace (e.g., `"New York"` -> `"newyork"`).
  - Compares derived key with wrapper config. Supports legacy fallback check (preserving middle space between words).

### N. Master Password Setup Screens
- **Master Password Intro (`app/master-password-intro.tsx`)**:
  - Header badge displaying a key icon, title "Master Password".
  - Multi-feature container card showing:
    - *Super Strong Passwords* (`shield-checkmark` inside blue circle)
    - *Always the Same* (`refresh` inside blue circle)
    - *No Dictionary Attacks* (`lock-closed` inside blue circle)
  - Detail flow box: explains concatenation logic. Set button routes to `/master-password-setup`. Skip button routes back.
- **Master Password Setup (`app/master-password-setup.tsx`)**:
  - Info badge: `"This info creates your master password. Keep it memorable!"`
  - Multi-input card form:
    1. *First Name*: whitespace stripped on input.
    2. *Last Name*: whitespace stripped on input.
    3. *Birth Year*: max 4 digits numeric filter.
    4. *Favorite Color*: whitespace stripped on input.
  - Concatenation: Joins `firstName` + `lastName` + `birthYear` + `favoriteColor` (lowercase, spaces stripped) and saves it to SecureStore (`master_password_v1`). Routes to `/master-password-locked`.
- **Master Password Locked (`app/master-password-locked.tsx`)**:
  - Center badge wrapping illustration image `@/assets/images/shh.png` (`width: 100`, `height: 100`) inside a white circular block (`width/height: 120`, border).
  - Details card describing: Cannot be changed, Secure & Consistent, Works Everywhere rules.
  - Link: "Want to see your master password?" routing to `/view-master-password`.
- **View Master Password (`app/view-master-password.tsx`)**:
  - Amber warning box: `"Cannot be changed! These details are part of your password identity. Even a small change will generate completely new passwords."`
  - Password view card: displays value in monospace font, masked as dots `●` by default, toggled via eye icon badge. Selectable text supports copy.
  - Red warning box: details reset instructions requiring app reinstallation.

### O. Backup Management Screens
- **Backup Export (`app/export.tsx`)**:
  - Visual summary card indicating backup encryption rules.
  - Form: Backup Password and Confirm Password inputs with eye toggle buttons (minimum 6 characters).
  - Process: decrypts vault, pulls master password, encrypts both passwords list and master password using backup password, bundles outputs under JSON version `"2.0"`, saves file locally as `.vxb`, and opens share sheet.
- **Backup Import (`app/import.tsx`)**:
  - Visual pick container: dashed border box with document picker launch bindings. Files restricted to `.vxb` extensions.
  - Input field for backup password decryption.
  - Logic: decrypts payload, verifies version formats, merges/overwrites credentials database, re-writes the master password wrap to SecureStore, and syncs session state.

---

## 5. Native Android Implementations (Verbatim Code)

Create these files exactly as written inside your Android workspace folder:

### A. Screen Security (`ScreenSecurityModule.kt`)
Allows React Native to block screenshots and screen recordings.

```kotlin
package com.chiranth7.vaultx

import android.view.WindowManager
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class ScreenSecurityModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    override fun getName(): String {
        return "ScreenSecurity"
    }

    @ReactMethod
    fun setScreenshotBlocking(block: Boolean, promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity != null) {
                activity.runOnUiThread {
                    if (block) {
                        activity.window.setFlags(
                            WindowManager.LayoutParams.FLAG_SECURE,
                            WindowManager.LayoutParams.FLAG_SECURE
                        )
                    } else {
                        activity.window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                    }
                }
                promise.resolve(true)
            } else {
                promise.reject("NO_ACTIVITY", "Activity not available")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun isScreenshotBlocked(promise: Promise) {
        try {
            val activity = reactApplicationContext.currentActivity
            if (activity != null) {
                val flags = activity.window.attributes.flags
                val isBlocked = (flags and WindowManager.LayoutParams.FLAG_SECURE) != 0
                promise.resolve(isBlocked)
            } else {
                promise.reject("NO_ACTIVITY", "Activity not available")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
```

Add the corresponding package wrapper `ScreenSecurityPackage.kt`:

```kotlin
package com.chiranth7.vaultx

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ScreenSecurityPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(ScreenSecurityModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

---

### B. Clipboard Monitor (`ClipboardMonitorModule.kt`)
Monitors clipboard. If copied text matches password heuristics, displays a notification deep-linked to VaultX.

```kotlin
package com.chiranth7.vaultx

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import androidx.core.app.NotificationCompat
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule

class ClipboardMonitorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    private val CHANNEL_ID = "vaultx_clipboard"
    private val NOTIFICATION_ID = 1001
    private var clipboardManager: ClipboardManager? = null
    private var lastClipboardText: String = ""
    private var isMonitoring = false
    
    override fun getName(): String {
        return "ClipboardMonitor"
    }
    
    init {
        clipboardManager = reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as? ClipboardManager
        createNotificationChannel()
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "VaultX Clipboard"
            val descriptionText = "Notifications for saving passwords from clipboard"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }
    
    @ReactMethod
    fun startMonitoring() {
        isMonitoring = true
        clipboardManager?.addPrimaryClipChangedListener {
            if (isMonitoring) {
                checkClipboard()
            }
        }
    }
    
    @ReactMethod
    fun stopMonitoring() {
        isMonitoring = false
    }
    
    private fun checkClipboard() {
        try {
            val clipData = clipboardManager?.primaryClip
            if (clipData != null && clipData.itemCount > 0) {
                val text = clipData.getItemAt(0).text?.toString() ?: return
                
                if (text == lastClipboardText || text.isEmpty()) return
                lastClipboardText = text
                
                if (isLikelyPassword(text)) {
                    showNotification(text)
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    private fun isLikelyPassword(text: String): Boolean {
        if (text.length < 6 || text.length > 100) return false
        if (text.trim().isEmpty()) return false
        if (text.startsWith("http://") || text.startsWith("https://")) return false
        if (text.contains("\n")) return false
        
        val hasLetters = text.any { it.isLetter() }
        val hasDigits = text.any { it.isDigit() }
        
        return hasLetters || hasDigits
    }
    
    private fun showNotification(password: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW).apply {
                data = Uri.parse("vaultx://add?password=${Uri.encode(password)}")
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            }
            
            val pendingIntent = PendingIntent.getActivity(
                reactApplicationContext,
                0,
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            
            val notificationManager = reactApplicationContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            
            val notification = NotificationCompat.Builder(reactApplicationContext, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle("Password Detected")
                .setContentText("Tap to save to VaultX")
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true)
                .setContentIntent(pendingIntent)
                .build()
            
            notificationManager.notify(NOTIFICATION_ID, notification)
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
    
    @ReactMethod
    fun getClipboardText(promise: Promise) {
        try {
            val clipData = clipboardManager?.primaryClip
            if (clipData != null && clipData.itemCount > 0) {
                val text = clipData.getItemAt(0).text?.toString() ?: ""
                promise.resolve(text)
            } else {
                promise.resolve("")
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
```

Add the corresponding package wrapper `ClipboardMonitorPackage.kt`:

```kotlin
package com.chiranth7.vaultx

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class ClipboardMonitorPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(ClipboardMonitorModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

---

### C. Android Autofill Service (`VaultXAutofillService.kt`)
Implements system-wide password suggestions when users tap login inputs in other apps and browsers.

```kotlin
package com.chiranth7.vaultx

import android.app.assist.AssistStructure
import android.os.Build
import android.os.CancellationSignal
import android.service.autofill.*
import android.view.autofill.AutofillId
import android.widget.RemoteViews
import androidx.annotation.RequiresApi
import android.content.IntentSender
import android.view.View
import android.util.Log
import android.content.Intent
import android.app.PendingIntent

@RequiresApi(Build.VERSION_CODES.O)
class VaultXAutofillService : AutofillService() {

    companion object {
        private const val TAG = "VaultXAutofill"
    }

    override fun onFillRequest(
        request: FillRequest,
        cancellationSignal: CancellationSignal,
        callback: FillCallback
    ) {
        Log.d(TAG, "Autofill request received")

        val structure = request.fillContexts.lastOrNull()?.structure
        if (structure == null) {
            callback.onSuccess(null)
            return
        }

        val packageName = structure.activityComponent.packageName
        
        if (packageName == "com.chiranth7.vaultx") {
            Log.d(TAG, "Ignoring autofill in VaultX app")
            callback.onSuccess(null)
            return
        }
        
        val webDomain = extractWebDomain(structure)
        Log.d(TAG, "Autofill for: $packageName / $webDomain")

        val fields = parseStructure(structure)
        if (fields.usernameId == null && fields.passwordId == null) {
            Log.d(TAG, "No login fields found")
            callback.onSuccess(null)
            return
        }

        val responseBuilder = FillResponse.Builder()
        
        val presentation = RemoteViews(packageName, android.R.layout.simple_list_item_1).apply {
            setTextViewText(android.R.id.text1, "🔐 Fill with VaultX")
        }
        
        val autofillIntent = Intent(this, MainActivity::class.java).apply {
            putExtra("autofill_mode", true)
            putExtra("package_name", packageName)
            putExtra("web_domain", webDomain)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
        }
        
        val pendingIntent = PendingIntent.getActivity(
            this,
            System.currentTimeMillis().toInt(),
            autofillIntent,
            PendingIntent.FLAG_CANCEL_CURRENT or PendingIntent.FLAG_MUTABLE
        )
        
        val datasetBuilder = Dataset.Builder()
        datasetBuilder.setAuthentication(pendingIntent.intentSender)
        
        fields.usernameId?.let { 
            datasetBuilder.setValue(it, null, presentation)
        }
        fields.passwordId?.let { 
            datasetBuilder.setValue(it, null, presentation)
        }
        
        responseBuilder.addDataset(datasetBuilder.build())
        callback.onSuccess(responseBuilder.build())
    }

    override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
        callback.onSuccess()
    }

    private data class AutofillFields(
        val usernameId: AutofillId?,
        val passwordId: AutofillId?
    )

    private fun parseStructure(structure: AssistStructure): AutofillFields {
        var usernameId: AutofillId? = null
        var passwordId: AutofillId? = null

        for (i in 0 until structure.windowNodeCount) {
            val windowNode = structure.getWindowNodeAt(i)
            findFields(windowNode.rootViewNode) { node ->
                when {
                    isPasswordField(node) && passwordId == null -> passwordId = node.autofillId
                    isUsernameField(node) && usernameId == null -> usernameId = node.autofillId
                }
            }
        }

        return AutofillFields(usernameId, passwordId)
    }

    private fun findFields(node: AssistStructure.ViewNode, callback: (AssistStructure.ViewNode) -> Unit) {
        callback(node)
        for (i in 0 until node.childCount) {
            findFields(node.getChildAt(i), callback)
        }
    }

    private fun isPasswordField(node: AssistStructure.ViewNode): Boolean {
        val hints = node.autofillHints ?: emptyArray()
        val inputType = node.inputType
        
        return hints.any { it == View.AUTOFILL_HINT_PASSWORD } ||
               (inputType and 0x00000080) != 0 || 
               (inputType and 0x00000090) != 0
    }

    private fun isUsernameField(node: AssistStructure.ViewNode): Boolean {
        val hints = node.autofillHints ?: emptyArray()
        val idEntry = node.idEntry?.lowercase() ?: ""
        val hint = node.hint?.lowercase() ?: ""
        
        return hints.any { 
            it == View.AUTOFILL_HINT_USERNAME || 
            it == View.AUTOFILL_HINT_EMAIL_ADDRESS 
        } || idEntry.contains("user") || 
            idEntry.contains("email") || 
            hint.contains("user") || 
            hint.contains("email")
    }

    private fun extractWebDomain(structure: AssistStructure): String? {
        for (i in 0 until structure.windowNodeCount) {
            structure.getWindowNodeAt(i).rootViewNode.webDomain?.let { return it }
        }
        return null
    }
}
```

Add the corresponding package bridge wrapper `AutofillModule.kt`:

```kotlin
package com.chiranth7.vaultx

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.provider.Settings
import android.view.autofill.AutofillManager
import com.facebook.react.bridge.*

class AutofillModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "AutofillModule"

    @ReactMethod
    fun isAutofillAvailable(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun isAutofillEnabled(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val autofillManager = reactApplicationContext.getSystemService(AutofillManager::class.java)
                val enabled = autofillManager?.hasEnabledAutofillServices() ?: false
                promise.resolve(enabled)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openAutofillSettings(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val intent = Intent(Settings.ACTION_REQUEST_SET_AUTOFILL_SERVICE)
                intent.data = android.net.Uri.parse("package:${reactApplicationContext.packageName}")
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                reactApplicationContext.startActivity(intent)
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun disableAutofill(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val autofillManager = reactApplicationContext.getSystemService(AutofillManager::class.java)
                autofillManager?.disableAutofillServices()
                promise.resolve(true)
            } else {
                promise.resolve(false)
            }
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }
}
```

Add the package registration `AutofillPackage.kt`:

```kotlin
package com.chiranth7.vaultx

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class AutofillPackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(AutofillModule(reactContext))
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

---

## 7. Android Manifest & Configuration Integration

### A. AndroidManifest.xml Modifications
Add the following service configurations and permissions to `android/app/src/main/AndroidManifest.xml`:

```xml
<!-- Permissions -->
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />

<!-- Autofill Service Registration -->
<service
    android:name="com.chiranth7.vaultx.VaultXAutofillService"
    android:label="VaultX Autofill"
    android:permission="android.permission.BIND_AUTOFILL_SERVICE"
    android:exported="true">
    <intent-filter>
        <action android:name="android.service.autofill.AutofillService" />
    </intent-filter>
    <meta-data
        android:name="android.view.autofill"
        android:resource="@xml/autofill_service_config" />
</service>
```

### B. Register packages in `MainApplication.kt`
Ensure native package modules are instantiated inside `getPackages()` of `MainApplication.kt`:

```kotlin
override fun getPackages(): List<ReactPackage> =
    PackageList(this).packages.apply {
      add(ClipboardMonitorPackage())
      add(ScreenSecurityPackage())
      add(AutofillPackage())
    }
```

### C. Create `autofill_service_config.xml`
Create inside `android/app/src/main/res/xml/autofill_service_config.xml`:

```xml
<?xml version="1.0" encoding="utf-8"?>
<autofill-service
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:settingsActivity="com.chiranth7.vaultx.MainActivity" />
```

---

## 8. Development Instructions

1. Configure `app.json` with the scheme `"scheme": "vaultx"`.
2. Generate project files by running `npx expo prebuild` to initialize the Android directories.
3. Apply the Native Kotlin source files listed above into `android/app/src/main/java/com/chiranth7/vaultx/`.
4. Run `npm install` to secure packages, followed by `npx expo run:android` to compile the native bindings on your emulator or target device.
