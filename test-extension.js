// Quick test script to verify extension functionality
// Run this in browser console on X/Twitter to test

console.log('🧪 Testing Quirkly Extension...');

// Test 1: Check if extension is loaded
if (window.quirklyInitialized) {
  console.log('✅ Extension is initialized');
} else {
  console.log('❌ Extension not initialized');
}

// Test 2: Check if profile extractor is available
if (window.XProfileExtractor) {
  console.log('✅ Profile extractor available');
} else {
  console.log('❌ Profile extractor not available');
}

// Test 3: Check if QuirklyConfig is available
if (window.QuirklyConfig) {
  console.log('✅ Config available:', window.QuirklyConfig.getEnvironmentInfo());
} else {
  console.log('❌ Config not available');
}

// Test 4: Check if we're on a profile page
const isProfilePage = /(twitter\.com|x\.com)\/[^\/]+\/?$/.test(window.location.href) && 
                     !window.location.href.includes('/home') && 
                     !window.location.href.includes('/explore') && 
                     !window.location.href.includes('/notifications');

console.log('📍 Profile page detected:', isProfilePage);

// Test 5: Check for reply composer
const replyComposer = document.querySelector('[data-testid="tweetTextarea_0"]');
console.log('📝 Reply composer found:', !!replyComposer);

// Test 6: Check for Quirkly buttons
const quirklyButtons = document.querySelector('.quirkly-buttons');
console.log('🔘 Quirkly buttons found:', !!quirklyButtons);

console.log('🧪 Extension test complete');
