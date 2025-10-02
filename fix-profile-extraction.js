// Comprehensive fix for profile extraction issues
// This script addresses multiple problems with profile data extraction

console.log('🔧 Applying comprehensive profile extraction fixes...');

// Fix 1: Ensure XProfileExtractor is available and properly initialized
function ensureProfileExtractor() {
  if (!window.XProfileExtractor) {
    console.error('❌ XProfileExtractor not available - extension may not be loaded properly');
    return false;
  }
  
  console.log('✅ XProfileExtractor is available');
  return true;
}

// Fix 2: Improve profile page detection
function isProfilePageImproved() {
  const url = window.location.href;
  const pathname = window.location.pathname;
  
  // More comprehensive profile page detection
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
  
  console.log('🔍 Profile page detection:', {
    url: url,
    pathname: pathname,
    isProfilePage: isProfilePage
  });
  
  return isProfilePage;
}

// Fix 3: Wait for critical elements to load
function waitForCriticalElements() {
  return new Promise((resolve) => {
    const maxWaitTime = 10000; // 10 seconds
    const checkInterval = 500; // 500ms
    let elapsedTime = 0;
    
    const checkElements = () => {
      // Check for common profile elements
      const criticalSelectors = [
        '[data-testid="UserName"]', // Username element
        '[data-testid="UserProfileHeader_Items"]', // Profile stats
        'h1[data-testid="UserName"]', // Alternative username selector
        'a[href*="/followers"]', // Follower link
        'a[href*="/following"]' // Following link
      ];
      
      const foundElements = criticalSelectors.filter(selector => 
        document.querySelector(selector) !== null
      );
      
      console.log(`🔍 Found ${foundElements.length}/${criticalSelectors.length} critical elements`);
      
      if (foundElements.length >= 2 || elapsedTime >= maxWaitTime) {
        console.log('✅ Critical elements loaded or timeout reached');
        resolve(foundElements.length >= 2);
      } else {
        elapsedTime += checkInterval;
        setTimeout(checkElements, checkInterval);
      }
    };
    
    checkElements();
  });
}

// Fix 4: Enhanced profile data extraction with better error handling
async function extractProfileDataEnhanced() {
  try {
    console.log('🔍 Starting enhanced profile data extraction...');
    
    if (!ensureProfileExtractor()) {
      throw new Error('XProfileExtractor not available');
    }
    
    if (!isProfilePageImproved()) {
      throw new Error('Not on a profile page');
    }
    
    // Wait for critical elements
    const elementsReady = await waitForCriticalElements();
    if (!elementsReady) {
      console.warn('⚠️ Critical elements not found, proceeding anyway...');
    }
    
    // Create extractor instance
    const extractor = new window.XProfileExtractor();
    
    // Extract profile data
    const profileData = await extractor.extractProfileData();
    
    if (!profileData) {
      throw new Error('Profile extraction returned null');
    }
    
    // Validate critical data
    if (!profileData.xHandle) {
      throw new Error('Could not extract username/handle');
    }
    
    console.log('✅ Profile data extracted successfully:', {
      handle: profileData.xHandle,
      displayName: profileData.displayName,
      followerCount: profileData.followerCount,
      followingCount: profileData.followingCount,
      joinDate: profileData.joinDate
    });
    
    return profileData;
    
  } catch (error) {
    console.error('❌ Enhanced profile extraction failed:', error);
    return null;
  }
}

// Fix 5: Test profile extraction with detailed diagnostics
async function testProfileExtraction() {
  console.log('🧪 Testing profile extraction with diagnostics...');
  
  // Step 1: Check extension availability
  console.log('\n=== STEP 1: Extension Check ===');
  const extensionAvailable = ensureProfileExtractor();
  console.log('Extension available:', extensionAvailable);
  
  // Step 2: Check page type
  console.log('\n=== STEP 2: Page Type Check ===');
  const isProfile = isProfilePageImproved();
  console.log('Is profile page:', isProfile);
  
  // Step 3: Check critical elements
  console.log('\n=== STEP 3: Critical Elements Check ===');
  const elementsReady = await waitForCriticalElements();
  console.log('Critical elements ready:', elementsReady);
  
  // Step 4: Try extraction
  console.log('\n=== STEP 4: Profile Extraction ===');
  if (extensionAvailable && isProfile) {
    const profileData = await extractProfileDataEnhanced();
    console.log('Extraction result:', profileData);
    return profileData;
  } else {
    console.log('❌ Cannot proceed with extraction - prerequisites not met');
    return null;
  }
}

// Fix 6: Manual element inspection helper
function inspectProfileElements() {
  console.log('\n=== MANUAL ELEMENT INSPECTION ===');
  
  const selectors = [
    '[data-testid="UserName"]',
    '[data-testid="UserProfileHeader_Items"]',
    'h1[data-testid="UserName"]',
    'a[href*="/followers"]',
    'a[href*="/following"]',
    'span:contains("Followers")',
    'span:contains("Following")'
  ];
  
  selectors.forEach(selector => {
    try {
      const elements = document.querySelectorAll(selector);
      console.log(`\nSelector: ${selector}`);
      console.log(`Found: ${elements.length} elements`);
      
      elements.forEach((el, i) => {
        console.log(`  Element ${i + 1}:`, el);
        console.log(`  Text: "${el.textContent?.trim()}"`);
        console.log(`  HTML: ${el.outerHTML.substring(0, 100)}...`);
      });
    } catch (error) {
      console.log(`  ❌ Error with selector: ${error.message}`);
    }
  });
}

// Auto-run the test
console.log('🚀 Auto-running profile extraction test...');
testProfileExtraction().then(result => {
  if (result) {
    console.log('✅ Profile extraction test completed successfully!');
  } else {
    console.log('❌ Profile extraction test failed - run inspectProfileElements() for details');
    inspectProfileElements();
  }
});

// Make functions available globally for manual testing
window.testProfileExtraction = testProfileExtraction;
window.extractProfileDataEnhanced = extractProfileDataEnhanced;
window.inspectProfileElements = inspectProfileElements;
window.isProfilePageImproved = isProfilePageImproved;

console.log('🔧 Profile extraction fixes applied! Available functions:');
console.log('- testProfileExtraction()');
console.log('- extractProfileDataEnhanced()');
console.log('- inspectProfileElements()');
console.log('- isProfilePageImproved()');
