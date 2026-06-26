# Screenshots Guide for F-Droid Submission

## 📁 Directory Structure

Screenshots for F-Droid should be placed in the following directory structure:

```
fastlane/metadata/android/en-US/images/
├── phoneScreenshots/          # Phone screenshots (required)
│   ├── 1_dashboard.png
│   ├── 2_add_password.png
│   ├── 3_categories.png
│   ├── 4_settings.png
│   └── 5_autofill.png
├── featureGraphic/           # Feature graphic (optional)
│   └── featureGraphic.png
└── icon/                     # App icon (optional)
    └── icon.png
```

## 📱 Screenshot Requirements

### Phone Screenshots (`phoneScreenshots/`)
- **Format**: PNG or JPG
- **Dimensions**: 
  - Minimum: 320px wide
  - Maximum: 3840px wide
  - Aspect ratio: Between 1:2 and 2:1
- **Recommended**: 1080x1920 (portrait) or 1920x1080 (landscape)
- **Count**: 2-8 screenshots
- **Naming**: Use descriptive names with numbers for ordering

### Feature Graphic (`featureGraphic/`)
- **Format**: PNG or JPG
- **Dimensions**: 1024x500 pixels (exactly)
- **Purpose**: Banner image shown in F-Droid
- **Optional but recommended**

### App Icon (`icon/`)
- **Format**: PNG
- **Dimensions**: 512x512 pixels
- **Purpose**: High-resolution app icon
- **Optional** (F-Droid can extract from APK)

## 🎯 Recommended Screenshots for VaultX

### 1. Dashboard/Main Screen (`1_dashboard.png`)
- Show the main password list
- Include some sample entries (use fake data)
- Show the search bar and FAB button
- Demonstrate the clean, organized interface

### 2. Add/Edit Password (`2_add_password.png`)
- Show the add password form
- Include the password strength indicator
- Show category selection
- Demonstrate the user-friendly form design

### 3. Categories View (`3_categories.png`)
- Show the category organization
- Display different service icons
- Show the category-based filtering
- Highlight the smart organization feature

### 4. Settings Screen (`4_settings.png`)
- Show the settings interface
- Include security options
- Show theme selection
- Demonstrate the comprehensive configuration options

### 5. Autofill Demo (`5_autofill.png`)
- Show the autofill service in action (if possible)
- Or show the autofill settings
- Demonstrate the seamless integration
- Highlight the convenience feature

### 6. Security Features (`6_security.png`) - Optional
- Show biometric unlock screen
- Or master password setup
- Highlight the security-first approach
- Demonstrate privacy features

## 📐 Screenshot Guidelines

### Content Guidelines
- **Use fake/demo data** - Never include real passwords or personal information
- **Show key features** - Each screenshot should highlight a specific feature
- **Clean interface** - Ensure UI is in a clean, presentable state
- **Consistent theme** - Use the same theme across all screenshots
- **No personal info** - Avoid any personal or sensitive information

### Technical Guidelines
- **High quality** - Use high-resolution images
- **Proper orientation** - Keep consistent orientation (portrait recommended)
- **No device frames** - F-Droid prefers clean screenshots without device frames
- **Good lighting** - Ensure screenshots are clear and well-lit
- **No watermarks** - Don't add watermarks or branding

### Accessibility
- **High contrast** - Ensure good contrast for readability
- **Clear text** - Make sure all text is legible
- **Proper sizing** - UI elements should be appropriately sized
- **Color blind friendly** - Consider color blind users

## 🛠️ How to Take Screenshots

### Method 1: Android Emulator
1. Start Android emulator with your app
2. Navigate to each screen you want to capture
3. Use emulator's screenshot feature
4. Save as PNG files with descriptive names

### Method 2: Physical Device
1. Install your app on a physical device
2. Navigate to each screen
3. Take screenshots using device's screenshot function
4. Transfer files to your computer
5. Rename with descriptive names

### Method 3: Automated Screenshots (Advanced)
1. Use tools like `fastlane screengrab`
2. Write UI tests that navigate and capture screens
3. Generate consistent screenshots automatically

## 📝 Screenshot Descriptions

F-Droid doesn't use separate description files, but you should name your screenshots descriptively:

- `1_dashboard.png` - Main password manager interface
- `2_add_password.png` - Adding a new password entry
- `3_categories.png` - Organized password categories
- `4_settings.png` - App settings and configuration
- `5_autofill.png` - Autofill service integration

## 🎨 Design Tips

### Visual Consistency
- Use the same theme (dark or light) across all screenshots
- Maintain consistent UI state (same status bar, etc.)
- Use similar data density in list views

### Highlighting Features
- Show unique VaultX features prominently
- Include visual indicators of security (lock icons, etc.)
- Demonstrate the offline nature (no network indicators)

### Professional Appearance
- Clean, organized interface
- No error states or loading screens
- Proper spacing and alignment
- Consistent typography

## 🔍 Quality Checklist

Before submitting screenshots:

- [ ] All images are high resolution (1080p or higher)
- [ ] No personal or real password data visible
- [ ] Consistent theme and appearance
- [ ] All key features are represented
- [ ] Images are properly named and ordered
- [ ] No device frames or unnecessary elements
- [ ] Good contrast and readability
- [ ] Files are in PNG format
- [ ] Dimensions meet F-Droid requirements

## 📤 Submission Process

1. **Prepare screenshots** following the guidelines above
2. **Place files** in the correct directory structure
3. **Test locally** by viewing the images
4. **Commit to git** and push to your repository
5. **Update F-Droid metadata** if needed
6. **Submit** your F-Droid merge request

## 🔗 F-Droid Resources

- [F-Droid Metadata Reference](https://f-droid.org/docs/Build_Metadata_Reference/)
- [Fastlane Metadata Format](https://docs.fastlane.tools/actions/supply/)
- [F-Droid Submission Guidelines](https://f-droid.org/docs/Submitting_to_F-Droid/)

## 📞 Need Help?

If you need assistance with screenshots:
1. Check the F-Droid documentation
2. Look at other apps' metadata in the F-Droid repository
3. Ask on F-Droid forums or Matrix channels
4. Review existing successful submissions

---

**Remember**: Screenshots are often the first thing users see when browsing F-Droid. Make them count by showcasing VaultX's best features and professional design!