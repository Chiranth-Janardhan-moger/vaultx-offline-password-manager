# Adding New Services to VaultX

This guide explains how to add new services/companies to VaultX's smart search, icon mapping, and normalization system.

## 📍 Main File Location

**File:** `lib/service-icons.ts`

This single file controls:
- Service name normalization (e.g., "insta" → "Instagram")
- Icon mapping (which Ionicon to use)
- Brand color mapping (official brand colors)

---

## 🎯 How to Add a New Service

### Step 1: Add Name Normalization

**Location:** `lib/service-icons.ts` - Lines 4-70 (inside `normalizeServiceName` function)

**Purpose:** Maps variations of service names to a single canonical name

**Example:**
```typescript
if (service.includes('instagram') || service === 'insta' || service === 'ig') return 'Instagram';
```

**Add your service here:**
```typescript
// Find the appropriate category section and add:
if (service.includes('yourservice') || service === 'shortname') return 'YourService';
```

**Categories in the file:**
- **Lines 7-20:** Social Media (Instagram, Facebook, Twitter, etc.)
- **Lines 22-27:** Tech & Development (GitHub, GitLab, etc.)
- **Lines 29-33:** Google Services
- **Lines 35-38:** Microsoft Services
- **Lines 40-42:** Apple Services
- **Lines 44-48:** Cloud & Storage
- **Lines 50-54:** Payment & Finance
- **Lines 56-62:** Entertainment
- **Lines 64-66:** Communication
- **Lines 68-70:** Shopping

---

### Step 2: Add Icon Mapping

**Location:** `lib/service-icons.ts` - Lines 73-145 (inside `getServiceIcon` function)

**Purpose:** Maps service names to Ionicons

**Available Icon Types:**
- `logo-*` icons (e.g., `logo-instagram`, `logo-github`)
- Regular icons (e.g., `mail`, `card`, `game-controller`)

**Example:**
```typescript
if (service.includes('instagram') || service.includes('insta')) return 'logo-instagram';
```

**Add your service icon:**
```typescript
// Find the appropriate category and add:
if (service.includes('yourservice')) return 'logo-yourservice'; // or any Ionicon name
```

**Browse available icons:** [Ionicons Directory](https://ionic.io/ionicons)

---

### Step 3: Add Brand Color

**Location:** `lib/service-icons.ts` - Lines 147-195 (inside `getServiceColor` function)

**Purpose:** Maps service names to official brand colors

**Example:**
```typescript
if (service.includes('instagram') || service.includes('insta')) return '#E4405F';
```

**Add your service color:**
```typescript
// Find the appropriate category and add:
if (service.includes('yourservice')) return '#HEXCOLOR';
```

**Tips:**
- Use official brand colors from [BrandColors](https://brandcolors.net/)
- For dark/light theme support: `return isDarkTheme ? '#LIGHTCOLOR' : '#DARKCOLOR';`

---

## 📝 Complete Example: Adding Netflix

```typescript
// Step 1: Normalization (around line 56)
if (service.includes('netflix')) return 'Netflix';

// Step 2: Icon (around line 120)
if (service.includes('netflix')) return 'tv';

// Step 3: Color (around line 175)
if (service.includes('netflix')) return '#E50914';
```

---

## 🎨 Category Organization

### Social Media
- Instagram, Facebook, Twitter, LinkedIn, YouTube, TikTok, Snapchat, Reddit, Pinterest, WhatsApp, Telegram, Discord, Slack

### Tech & Development
- GitHub, GitLab, Bitbucket, Stack Overflow, npm, Docker

### Google Services
- Google, Gmail, Google Drive

### Microsoft Services
- Microsoft, Outlook, Microsoft Office

### Apple Services
- Apple, iCloud

### Cloud & Storage
- Dropbox, OneDrive, AWS

### Payment & Finance
- PayPal, Stripe, Venmo, Cash App

### Entertainment
- Netflix, Spotify, Twitch, Steam, PlayStation, Xbox

### Communication
- Zoom, Skype, Microsoft Teams

### Shopping
- Amazon, eBay

---

## ✅ Testing Your Changes

After adding a new service:

1. **Test Normalization:**
   - Go to "Add Password" or "Generate Password"
   - Type the short name (e.g., "insta")
   - Should show suggestion: "Use 'Instagram' instead?"

2. **Test Icon:**
   - Save a password with the service name
   - Check dashboard categories - icon should appear
   - Check search results - icon should appear

3. **Test Color:**
   - Icon background should use the brand color
   - Check in both light and dark themes

4. **Test Search:**
   - Search for the service
   - Should find it with any variation (short name, full name)

---

## 🔍 Where Smart Search is Used

The normalization system is automatically used in:

1. **Add Password Page** (`app/add.tsx`)
   - Shows suggestion chip when typing service name
   - Line 32: `normalizedSuggestion` calculation
   - Lines 145-154: Suggestion chip display

2. **Generate Password Page** (`app/generate-password.tsx`)
   - Shows suggestion chip when typing service name
   - Line 29: `normalizedSuggestion` calculation
   - Lines 127-136: Suggestion chip display

3. **Search Page** (`app/search.tsx`)
   - Groups services in "Quick Access" chips
   - Line 164: `normalizeServiceName` usage
   - Displays icons and colors for all results

4. **Category Pages** (`app/category/[id].tsx`)
   - Shows icons and colors for each password
   - Automatically uses `getServiceIcon` and `getServiceColor`

5. **Dashboard** (`app/dashboard.tsx`)
   - Category cards show password counts
   - Uses categorization system

---

## 🎯 Quick Reference: Common Patterns

### Pattern 1: Service with Multiple Names
```typescript
// Normalization
if (service.includes('instagram') || service === 'insta' || service === 'ig') return 'Instagram';

// Icon
if (service.includes('instagram') || service.includes('insta')) return 'logo-instagram';

// Color
if (service.includes('instagram') || service.includes('insta')) return '#E4405F';
```

### Pattern 2: Service with Dark/Light Theme Colors
```typescript
// Color with theme support
if (service.includes('github')) return isDarkTheme ? '#FFFFFF' : '#181717';
```

### Pattern 3: Service Without Official Logo Icon
```typescript
// Use generic icon
if (service.includes('zoom')) return 'videocam';
if (service.includes('bank')) return 'business';
if (service.includes('email')) return 'mail';
```

---

## 📦 No Rebuild Required

Changes to `lib/service-icons.ts` are **hot-reloadable**:
- Just save the file
- App will automatically reload
- Test immediately

---

## 🚀 Best Practices

1. **Use lowercase in conditions:** Always use `.toLowerCase()` or check lowercase strings
2. **Check includes() first:** Use `service.includes('name')` for flexibility
3. **Add exact matches:** Add `service === 'shortname'` for common abbreviations
4. **Group related services:** Keep similar services together in the file
5. **Use official colors:** Get colors from brand guidelines
6. **Test variations:** Try different spellings users might type
7. **Keep it simple:** Don't over-complicate the matching logic

---

## 📚 Resources

- **Ionicons:** https://ionic.io/ionicons
- **Brand Colors:** https://brandcolors.net/
- **Color Picker:** https://htmlcolorcodes.com/

---

## 💡 Tips

- **Popular services first:** Add commonly used services at the top of each category
- **Case insensitive:** All matching is case-insensitive automatically
- **Partial matching:** `includes()` allows partial matches (e.g., "instagram" matches "Instagram App")
- **Fallback icons:** If no logo exists, use relevant generic icons (mail, card, globe, etc.)
- **Default color:** If no color specified, uses `#6366f1` (app primary color)

---

## 🎉 You're Done!

Your new service will now:
- ✅ Show smart suggestions when typing
- ✅ Display with correct icon
- ✅ Use official brand colors
- ✅ Be searchable with any variation
- ✅ Appear in Quick Access if frequently used
- ✅ Work across all app screens

Happy coding! 🚀
