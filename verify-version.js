/**
 * Quick Version Verification Script
 * Run this in the browser console to verify the correct version is loaded
 */

console.clear();
console.log('='.repeat(60));
console.log('🔍 QUIRKLY EXTENSION VERSION CHECK');
console.log('='.repeat(60));

// Check 1: Content Script Version
console.log('\n1️⃣ Content Script Check:');
const scripts = Array.from(document.querySelectorAll('script'));
const contentScript = scripts.find(s => s.textContent && s.textContent.includes('Quirkly Content Script'));
if (contentScript) {
  const versionMatch = contentScript.textContent.match(/Version: ([\d.]+)/);
  if (versionMatch) {
    const version = versionMatch[1];
    if (version === '2.0.0') {
      console.log('✅ Content Script Version:', version, '(CORRECT)');
    } else {
      console.log('❌ Content Script Version:', version, '(OUTDATED - should be 2.0.0)');
      console.log('⚠️ Action needed: Reload extension');
    }
  } else {
    console.log('❌ Version not found in content script');
    console.log('⚠️ Action needed: Reload extension');
  }
} else {
  console.log('❌ Content script not loaded');
}

// Check 2: XProfileExtractor Availability
console.log('\n2️⃣ Profile Extractor Check:');
if (typeof window.XProfileExtractor === 'function') {
  console.log('✅ XProfileExtractor is available');
  const extractor = new window.XProfileExtractor();
  console.log('✅ XProfileExtractor instantiated successfully');
} else {
  console.log('❌ XProfileExtractor is NOT available');
  console.log('⚠️ Action needed: Reload extension');
}

// Check 3: Quirkly Instance
console.log('\n3️⃣ Quirkly Instance Check:');
if (typeof window.quirklyInstance !== 'undefined') {
  console.log('✅ Quirkly instance exists');
} else {
  console.log('⚠️ Quirkly instance not yet created (may be normal)');
}

// Check 4: Error in Console
console.log('\n4️⃣ Error Check:');
const hasError = performance.getEntries().some(entry => 
  entry.name && entry.name.includes('content.js') && entry.duration === 0
);
if (!hasError) {
  console.log('✅ No obvious loading errors detected');
} else {
  console.log('⚠️ Potential loading error detected');
}

// Check 5: Extension Manifest
console.log('\n5️⃣ Extension Manifest Check:');
try {
  chrome.runtime.getManifest((manifest) => {
    console.log('✅ Extension ID:', chrome.runtime.id);
    console.log('✅ Extension Version:', manifest.version);
    if (manifest.version === '2.0.0') {
      console.log('✅ Manifest version is correct (2.0.0)');
    } else {
      console.log('❌ Manifest version is outdated:', manifest.version);
      console.log('⚠️ Action needed: Reload extension');
    }
  });
} catch (e) {
  console.log('⚠️ Could not check manifest (may be normal in content script)');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 SUMMARY:');
console.log('='.repeat(60));

const allGood = (
  contentScript && 
  contentScript.textContent.includes('Version: 2.0.0') &&
  typeof window.XProfileExtractor === 'function'
);

if (allGood) {
  console.log('✅✅✅ ALL CHECKS PASSED - Extension is properly loaded!');
  console.log('\n💡 Next steps:');
  console.log('   1. Look for the "🔄 Extract Profile" button (bottom-right)');
  console.log('   2. Click it to test profile extraction');
  console.log('   3. Check console for extraction logs');
} else {
  console.log('❌ SOME CHECKS FAILED - Extension needs to be reloaded');
  console.log('\n🔧 How to fix:');
  console.log('   1. Go to chrome://extensions/');
  console.log('   2. Remove the extension completely');
  console.log('   3. Click "Load unpacked"');
  console.log('   4. Select: /Users/gauravbhatia/Technioz/XBot');
  console.log('   5. Reload this page (Cmd+Shift+R or Ctrl+Shift+R)');
}

console.log('='.repeat(60));

