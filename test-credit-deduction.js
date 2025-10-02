// Test script to verify credit deduction is working
// Run this in the browser console on X/Twitter

console.log('🧪 Testing credit deduction functionality...');

// Check if the extension is loaded
if (typeof Quirkly !== 'undefined') {
  console.log('✅ Quirkly extension is loaded');
  
  // Check if we can access the background script
  chrome.runtime.sendMessage({ action: 'test' }, (response) => {
    if (chrome.runtime.lastError) {
      console.error('❌ Error communicating with background script:', chrome.runtime.lastError);
    } else {
      console.log('✅ Background script communication working');
    }
  });
  
  // Test reply generation
  console.log('🔍 Looking for reply buttons to test...');
  const replyButtons = document.querySelectorAll('.quirkly-tone-btn');
  console.log('Found reply buttons:', replyButtons.length);
  
  if (replyButtons.length > 0) {
    console.log('✅ Reply buttons found - you can click one to test credit deduction');
    console.log('📊 After clicking, check the background script console for logs');
  } else {
    console.log('❌ No reply buttons found - make sure you\'re on a tweet page');
  }
  
} else {
  console.log('❌ Quirkly extension not loaded');
  console.log('💡 Make sure to reload the extension at chrome://extensions/');
}

console.log('\n🔍 To see background script logs:');
console.log('1. Go to chrome://extensions/');
console.log('2. Find Quirkly extension');
console.log('3. Click "service worker" or "background page"');
console.log('4. This opens the background script console');
console.log('5. Generate a reply and check for logs there');
