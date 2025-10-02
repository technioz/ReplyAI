// Test script to debug profile extraction on X profile page
// Run this in the browser console on your X profile page

console.log('🔍 Testing profile extraction...');

// Test the follower count selectors
const selectors = [
  'a[href*="/followers"] span span',
  'a[href*="/followers"] span:first-child span',
  'a[href*="/followers"] span',
  'a[href*="/verified_followers"] span span',
  'a[href*="/verified_followers"] span:first-child span'
];

console.log('Testing follower count selectors:');
selectors.forEach((selector, index) => {
  const elements = document.querySelectorAll(selector);
  console.log(`\n${index + 1}. Selector: ${selector}`);
  console.log(`   Found ${elements.length} elements`);
  
  elements.forEach((element, elemIndex) => {
    const text = element.textContent?.trim();
    console.log(`   Element ${elemIndex + 1}: "${text}"`);
    
    // Try to parse as number
    if (text && !isNaN(parseInt(text))) {
      console.log(`   ✅ This looks like a number: ${parseInt(text)}`);
    } else if (text && text.toLowerCase() === 'followers') {
      console.log(`   ℹ️ This is the "Followers" label`);
    } else if (text && text.toLowerCase() === 'following') {
      console.log(`   ℹ️ This is the "Following" label`);
    }
  });
});

// Test following count selectors
console.log('\n\nTesting following count selectors:');
const followingSelectors = [
  'a[href*="/following"] span span',
  'a[href*="/following"] span:first-child span',
  'a[href*="/following"] span'
];

followingSelectors.forEach((selector, index) => {
  const elements = document.querySelectorAll(selector);
  console.log(`\n${index + 1}. Selector: ${selector}`);
  console.log(`   Found ${elements.length} elements`);
  
  elements.forEach((element, elemIndex) => {
    const text = element.textContent?.trim();
    console.log(`   Element ${elemIndex + 1}: "${text}"`);
    
    if (text && !isNaN(parseInt(text))) {
      console.log(`   ✅ This looks like a number: ${parseInt(text)}`);
    }
  });
});

// Look for any links with "followers" or "following" in href
console.log('\n\nLooking for follower/following links:');
const followerLinks = document.querySelectorAll('a[href*="followers"], a[href*="following"]');
followerLinks.forEach((link, index) => {
  console.log(`\nLink ${index + 1}:`);
  console.log(`   href: ${link.href}`);
  console.log(`   text: "${link.textContent?.trim()}"`);
  console.log(`   innerHTML: ${link.innerHTML}`);
});

console.log('\n🔍 Test completed. Check the output above to see what selectors are finding.');
