// Debug script for profile extraction
// Run this in the browser console on your X profile page

console.log('🔍 Debugging profile extraction...');

// First, check if the XProfileExtractor is available
if (window.XProfileExtractor) {
  console.log('✅ XProfileExtractor is available');
  
  // Create an instance and test extraction
  const extractor = new window.XProfileExtractor();
  
  console.log('🔍 Testing individual extraction methods...');
  
  // Test follower count extraction
  console.log('\n--- Testing Follower Count Extraction ---');
  const followerCount = extractor.extractFollowerCount();
  console.log('Follower count result:', followerCount);
  
  // Test following count extraction  
  console.log('\n--- Testing Following Count Extraction ---');
  const followingCount = extractor.extractFollowingCount();
  console.log('Following count result:', followingCount);
  
  // Test handle extraction
  console.log('\n--- Testing Handle Extraction ---');
  const handle = extractor.extractHandle();
  console.log('Handle result:', handle);
  
  // Test display name extraction
  console.log('\n--- Testing Display Name Extraction ---');
  const displayName = extractor.extractDisplayName();
  console.log('Display name result:', displayName);
  
  // Test full profile extraction
  console.log('\n--- Testing Full Profile Extraction ---');
  try {
    const fullProfile = await extractor.extractProfileData();
    console.log('Full profile result:', fullProfile);
  } catch (error) {
    console.error('Full profile extraction failed:', error);
  }
  
} else {
  console.log('❌ XProfileExtractor is NOT available');
  console.log('Available window objects:', Object.keys(window).filter(key => key.includes('Profile') || key.includes('Extract')));
}

// Also test the selectors manually
console.log('\n--- Manual Selector Testing ---');
const testSelectors = [
  'a[href*="/followers"] span span',
  'a[href*="/followers"] span:first-child span',
  'a[href*="/followers"] span',
  'a[href*="/verified_followers"] span span',
  'a[href*="/verified_followers"] span:first-child span'
];

testSelectors.forEach((selector, index) => {
  console.log(`\n${index + 1}. Testing selector: ${selector}`);
  const elements = document.querySelectorAll(selector);
  console.log(`   Found ${elements.length} elements`);
  
  elements.forEach((element, elemIndex) => {
    const text = element.textContent?.trim();
    console.log(`   Element ${elemIndex + 1}: "${text}"`);
  });
});

console.log('\n🔍 Debug completed!');
