# 🔄 How to Properly Reload the Chrome Extension

The error you're seeing is because Chrome is using a **cached version** of the old content.js file. Here's how to fix it:

## Method 1: Hard Reload (Recommended) ⚡

1. **Go to Extensions Page**
   - Open `chrome://extensions/` in your browser
   - Find the "Quirkly" or "XBot" extension

2. **Remove and Reload**
   - Click the **"Remove"** button (trash icon) to completely uninstall
   - Click **"Load unpacked"** button (top left)
   - Select the `/Users/gauravbhatia/Technioz/XBot` folder
   
3. **Clear X/Twitter Page Cache**
   - Go to X.com or Twitter.com
   - Press `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows) to hard reload
   - Or open DevTools (F12) → Right-click reload button → "Empty Cache and Hard Reload"

## Method 2: Update Extension Files (Alternative) 🔧

1. **Go to Extensions Page**
   - Open `chrome://extensions/`
   - Make sure "Developer mode" is ON (toggle in top right)

2. **Update Extension**
   - Find your extension
   - Click the **reload icon** (circular arrow)
   
3. **Force Clear Cache**
   - Close ALL X.com/Twitter.com tabs
   - Clear browser cache:
     - `Cmd + Shift + Delete` (Mac) or `Ctrl + Shift + Delete` (Windows)
     - Select "Cached images and files"
     - Time range: "Last hour"
     - Click "Clear data"
   
4. **Reopen X.com**
   - Open a new tab
   - Go to `https://x.com/heygauravbhatia`
   - Check console (F12) for errors

## Method 3: Increment Manifest Version (Most Reliable) 📦

This forces Chrome to recognize it as a new version:

1. **I'll update the manifest.json version for you**
2. **Then reload the extension** using Method 1 or 2 above

---

## ✅ How to Verify It's Fixed:

Open DevTools Console (F12) and run:

```javascript
// Check if the error is gone
console.log('Extension loaded without errors');

// Check if XProfileExtractor is available
console.log('XProfileExtractor:', typeof window.XProfileExtractor);

// Check content.js version
console.log('Script timestamp:', new Date().toISOString());
```

You should see:
- ✅ No error messages
- ✅ "XProfileExtractor: function"
- ✅ Current timestamp

---

## 🚨 If Still Not Working:

Run this in the terminal to verify the file is actually updated:

```bash
cd /Users/gauravbhatia/Technioz/XBot
grep -n "addProfileExtractionTestButton" content.js
```

**Expected output:** "No matches found" (meaning the function call is removed)

If you see matches, the git commit didn't apply locally. In that case:

```bash
git stash
git pull origin main
git stash pop
```

---

## Need More Help?

Let me know which method you tried and what happened!

