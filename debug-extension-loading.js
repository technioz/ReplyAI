// Debug script to check if extension scripts are loading
// Run this in the browser console on your X profile page

console.log('🔍 Debugging extension script loading...');

// Check if extension scripts are loaded
console.log('\n--- Checking Extension Scripts ---');
console.log('config.js loaded:', typeof QuirklyConfig !== 'undefined');
console.log('profileExtractor.js loaded:', typeof XProfileExtractor !== 'undefined');
console.log('content.js loaded:', typeof Quirkly !== 'undefined');

// Check available window objects
console.log('\n--- Available Window Objects ---');
const extensionObjects = Object.keys(window).filter(key => 
  key.includes('Quirkly') || 
  key.includes('Profile') || 
  key.includes('Extract') ||
  key.includes('Config')
);
console.log('Extension-related objects:', extensionObjects);

// Check if content script is initialized
console.log('\n--- Content Script Status ---');
if (typeof Quirkly !== 'undefined') {
  console.log('✅ Quirkly content script is available');
  
  // Try to create an instance
  try {
    const quirkly = new Quirkly();
    console.log('✅ Quirkly instance created successfully');
  } catch (error) {
    console.error('❌ Error creating Quirkly instance:', error);
  }
} else {
  console.log('❌ Quirkly content script not loaded');
}

// Check if profile extractor is available
console.log('\n--- Profile Extractor Status ---');
if (typeof XProfileExtractor !== 'undefined') {
  console.log('✅ XProfileExtractor is available');
  
  // Try to create an instance
  try {
    const extractor = new XProfileExtractor();
    console.log('✅ XProfileExtractor instance created successfully');
    
    // Test individual methods
    console.log('\n--- Testing Profile Extractor Methods ---');
    console.log('extractHandle method:', typeof extractor.extractHandle);
    console.log('extractFollowerCount method:', typeof extractor.extractFollowerCount);
    console.log('extractProfileData method:', typeof extractor.extractProfileData);
  } catch (error) {
    console.error('❌ Error creating XProfileExtractor instance:', error);
  }
} else {
  console.log('❌ XProfileExtractor not available');
}

// Check if we're on a profile page
console.log('\n--- Page Detection ---');
const url = window.location.href;
const isProfilePage = /(twitter\.com|x\.com)\/[^\/]+\/?$/.test(url) && 
                     !url.includes('/home') && 
                     !url.includes('/explore') && 
                     !url.includes('/notifications');
console.log('Current URL:', url);
console.log('Is profile page:', isProfilePage);

// Check for any console errors
console.log('\n--- Extension Loading Instructions ---');
console.log('If XProfileExtractor is NOT available:');
console.log('1. Go to chrome://extensions/');
console.log('2. Find the Quirkly extension');
console.log('3. Click the reload button (🔄)');
console.log('4. Refresh this X profile page');
console.log('5. Run this debug script again');

console.log('\n🔍 Extension debugging completed!');
