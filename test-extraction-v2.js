/**
 * Test Profile Extraction v2.0
 * Run this in the browser console on an X profile page
 */

console.log('🧪 Starting Profile Extraction Test v2.0...\n');

// Test 1: Check if extractor is available
console.log('=== TEST 1: Check Extractor Availability ===');
if (typeof XProfileExtractor !== 'undefined') {
  console.log('✅ XProfileExtractor is available');
} else if (window.XProfileExtractor) {
  console.log('✅ XProfileExtractor is available on window');
} else {
  console.error('❌ XProfileExtractor is NOT available');
  console.log('💡 Tip: Make sure the extension is loaded and you\'re on an X profile page');
}

// Test 2: Check page type
console.log('\n=== TEST 2: Page Type Check ===');
const url = window.location.href;
const pathname = window.location.pathname;
console.log('URL:', url);
console.log('Pathname:', pathname);

const isProfilePage = (
  (url.includes('twitter.com') || url.includes('x.com')) &&
  pathname && 
  pathname.length > 1 && 
  !pathname.includes('/home') && 
  !pathname.includes('/explore') && 
  !pathname.includes('/notifications') &&
  !pathname.includes('/messages') &&
  !pathname.includes('/settings') &&
  !pathname.includes('/compose') &&
  !pathname.includes('/search') &&
  !pathname.includes('/i/') &&
  !pathname.includes('/status/') &&
  !pathname.includes('/hashtag/')
);

if (isProfilePage) {
  console.log('✅ This is a profile page');
} else {
  console.log('❌ This is NOT a profile page');
  console.log('💡 Navigate to a profile page like: https://x.com/username');
}

// Test 3: Check critical elements
console.log('\n=== TEST 3: Critical Elements Check ===');
const criticalElements = {
  'UserName': document.querySelector('[data-testid="UserName"]'),
  'Followers Link': document.querySelector('a[href$="/followers"]'),
  'Following Link': document.querySelector('a[href$="/following"]'),
  'UserDescription': document.querySelector('[data-testid="UserDescription"]'),
  'UserAvatar': document.querySelector('[data-testid="UserAvatar"]')
};

Object.entries(criticalElements).forEach(([name, element]) => {
  if (element) {
    console.log(`✅ ${name}: Found`);
    if (name === 'Followers Link') {
      console.log(`   Text: "${element.textContent?.trim()}"`);
      console.log(`   HTML snippet: ${element.outerHTML.substring(0, 100)}...`);
    }
  } else {
    console.log(`❌ ${name}: Not found`);
  }
});

// Test 4: Manual follower count extraction
console.log('\n=== TEST 4: Manual Follower Count Extraction ===');
const followerLinks = document.querySelectorAll('a[href$="/followers"], a[href$="/verified_followers"]');
console.log(`Found ${followerLinks.length} follower links`);

if (followerLinks.length > 0) {
  followerLinks.forEach((link, i) => {
    console.log(`\nLink ${i + 1}:`);
    console.log(`  Href: ${link.href}`);
    console.log(`  Full text: "${link.textContent?.trim()}"`);
    
    const spans = link.querySelectorAll('span');
    console.log(`  Spans found: ${spans.length}`);
    
    spans.forEach((span, j) => {
      const text = span.textContent?.trim();
      console.log(`    Span ${j + 1}: "${text}"`);
      
      // Check if it's a number
      if (text && !text.toLowerCase().includes('follower') && !text.toLowerCase().includes('following')) {
        const isNumber = /^[\d,\.]+[KMB]?$/.test(text);
        if (isNumber) {
          console.log(`      ✅ This looks like a count: ${text}`);
        }
      }
    });
  });
} else {
  console.log('❌ No follower links found on page');
}

// Test 5: Try actual extraction
console.log('\n=== TEST 5: Actual Profile Extraction ===');
if ((typeof XProfileExtractor !== 'undefined' || window.XProfileExtractor) && isProfilePage) {
  const ExtractorClass = window.XProfileExtractor || XProfileExtractor;
  const extractor = new ExtractorClass();
  
  console.log('⏳ Running extraction...');
  extractor.extractProfileData().then(result => {
    console.log('\n📊 EXTRACTION RESULTS:');
    if (result) {
      console.log('✅ SUCCESS!');
      console.log(JSON.stringify(result, null, 2));
      
      console.log('\n📈 Summary:');
      console.log(`  Handle: ${result.xHandle}`);
      console.log(`  Display Name: ${result.displayName}`);
      console.log(`  Followers: ${result.followerCount}`);
      console.log(`  Following: ${result.followingCount}`);
      console.log(`  Bio: ${result.bio?.substring(0, 50)}${result.bio?.length > 50 ? '...' : ''}`);
      console.log(`  Verified: ${result.verified ? 'Yes' : 'No'}`);
      console.log(`  Recent Tweets: ${result.recentTweets?.length || 0}`);
    } else {
      console.log('❌ FAILED - Extraction returned null');
    }
  }).catch(error => {
    console.error('❌ FAILED - Error:', error);
  });
} else {
  console.log('⚠️ Skipping extraction (prerequisites not met)');
}

console.log('\n=== TEST COMPLETE ===');
console.log('💡 Check the results above to identify any issues');

