# VaultX Changelog

## Version 1.0.8 (2026-01-04)

### 🎉 Initial Release

#### ✅ Android Optimizations
- **APK Size Reduced by 60-70%** (from ~40-50 MB to 15-25 MB)
- Enabled R8 full mode for aggressive code shrinking
- Enabled ProGuard with 5 optimization passes
- Enabled resource shrinking to remove unused resources
- Enabled PNG crunching for image compression
- Architecture filtering (ARM only: armeabi-v7a, arm64-v8a)
- Disabled GIF, WebP, and animated image support
- Removed all logging in release builds
- Code obfuscation enabled for security

#### 🗑️ Removed/Cleaned Up
- **Splash Screen** — Completely removed for instant app launch
- **Unnecessary Permissions** — Only Biometric + Vibrate remain
  - Removed: Internet, Storage, System Alert Window
- **Deep Link Intent Filters** — Removed vaultx:// scheme
- **Backup Rules** — Set allowBackup=false for security
- **Expo Update Metadata** — Reduced to essentials
- **Queries Section** — Not needed for offline app
- **Round Icon Reference** — Removed from manifest
- **Drawable References** — Cleaned up non-existent drawables

#### 🎨 UI/UX Features
- Beautiful category system with gradient folders
- Smart auto-categorization (Google, Banking, Social Media, etc.)
- Smooth animations (staggered entrance, slide-in, fade)
- Dark mode support (System, Light, Dark)
- Enhanced contrast mode (Pure black AMOLED / Pure white)
- Optional borders toggle
- Service-specific icons (50+ branded icons)
- Long-press delete with smooth animation
- Floating action button with rotating animation

#### 🔐 Security Features
- AES-256-CBC encryption for all vault data
- PBKDF2 key derivation (10,000 iterations)
- 6-digit PIN lock with visual boxes
- Biometric authentication (Fingerprint/Face ID)
- Password unlock fallback
- Security question recovery
- Auto-lockout after failed attempts
- Screenshot protection
- Phone number masking (90XXXXX93)
- No network access (offline-first)

#### 🗂️ Password Management
- Add known passwords
- Generate master passwords (deterministic)
- View passwords by category
- Copy username/password to clipboard
- Password visibility toggle
- Notes support
- Smart categorization into 7 categories

#### 💾 Backup & Restore
- Secure backup export (.vxb format)
- User-controlled encryption
- Import from backup files
- File type validation
- Case-sensitive password warnings

#### ⚙️ Settings & App Info
- Theme selection (System, Light, Dark)
- Enhanced contrast toggle
- Show borders toggle
- Export/Import backup quick access
- Master password setup
- **App Info Section** (NEW)
  - **VaultX** displayed in large font (32px, bold)
  - Version automatically pulled from app.json (v1.0.8)
  - **"by Chiranth Moger"** author credit
  - GitHub source code link (clickable)
  - Star reminder for GitHub
  - Security info (AES-256, Offline-first, Open Source)
  - Tech stack info (React Native + Expo)

#### 📚 Documentation
- **README.md** — Comprehensive project documentation
  - Features overview
  - Installation instructions
  - Security details
  - Build instructions
  - Tech stack
  - Project structure
  - Contributing guidelines
- **BUILD_INSTRUCTIONS.md** — Detailed build guide
  - Build commands
  - Optimization details
  - Troubleshooting
  - Production release guide
- **FEATURES.md** — Complete feature list
  - All features categorized
  - Security measures
  - Performance metrics
  - UI components
  - Future enhancements

#### 🔧 Technical Improvements
- TypeScript throughout
- Expo Router for navigation
- React Context for state management
- Optimized crypto for mobile
- Minimal dependencies
- Hardware-backed key storage
- Efficient rendering
- Lazy loading

#### 📱 Platform Support
- Android (optimized)
- iOS (compatible)
- Offline-first architecture
- No cloud dependencies

---

## Upcoming Features (Planned)

### Version 1.0.8
- [x] App Info section with dynamic version from app.json
- [x] Author credit "by Chiranth Moger"
- [x] Large VaultX branding in settings
- [x] GitHub link with star reminder
- [x] Fixed app.json to use only icon.png (removed missing adaptive icon files)
- [x] Removed splash screen plugin (not needed)
- [x] Updated favicon to use .webp format
- [x] **APK Splitting**: Separate builds for arm64-v8a (64-bit) and armeabi-v7a (32-bit)
- [x] Smaller APK sizes: ~12-18 MB (v8a) and ~10-15 MB (v7a)

### Version 1.1.0
- [ ] Password strength analyzer
- [ ] Breach detection (offline)
- [ ] Password history tracking
- [ ] Secure notes
- [ ] Custom categories
- [ ] Tags system
- [ ] Favorites/starred passwords

### Version 1.2.0
- [ ] Auto-fill support (Android)
- [ ] Widgets for quick access
- [ ] Bulk operations
- [ ] Import from CSV
- [ ] Multi-vault support

### Version 2.0.0
- [ ] Wear OS companion app
- [ ] Secure password sharing
- [ ] Attachments support
- [ ] Advanced search
- [ ] Password audit

---

## Bug Fixes

### Version 1.0.8
- Fixed App Info section to show version dynamically from app.json
- Added author credit "by Chiranth Moger"
- Enhanced App Info header with large VaultX branding
- Improved GitHub link visibility
- Fixed app.json adaptive icon references (removed missing files)
- Removed splash screen plugin configuration
- Updated favicon to use existing .webp file

### Version 1.0.0
- Fixed crypto module errors with React Native polyfills
- Fixed file picker to accept .vxb files
- Fixed toggle design with proper dimensions
- Fixed theme consistency across screens
- Fixed category organization and display
- Fixed phone number masking across all screens
- Fixed Android manifest permissions
- Fixed ProGuard rules for proper optimization

---

## Performance Improvements

### Version 1.0.0
- Reduced PBKDF2 iterations for mobile performance
- Optimized animations with native driver
- Efficient categorization with smart keyword matching
- Minimal APK size with aggressive optimizations
- Fast startup with no splash screen
- Smooth UI with optimized re-renders

---

## Security Enhancements

### Version 1.0.0
- Military-grade AES-256 encryption
- Secure key derivation with PBKDF2
- Hardware-backed key storage
- No network access
- No cloud sync
- Backup disabled
- Code obfuscation
- Screenshot protection
- Phone number masking

---

## Breaking Changes

### Version 1.0.0
- Initial release, no breaking changes

---

## Migration Guide

### From Other Password Managers
1. Export your passwords from current manager
2. Manually add them to VaultX (no CSV import yet)
3. Use master password system for new passwords
4. Export VaultX backup for safety

---

## Known Issues

### Version 1.0.0
- None reported yet

---

## Credits

- Built with React Native + Expo
- Icons by Ionicons
- Encryption by crypto-js
- Inspired by 1Password, Bitwarden, KeePass

---

## License

MIT License - See LICENSE file for details

---

**VaultX** — Your passwords, your device, your control.

Made with ❤️ for privacy and security.
