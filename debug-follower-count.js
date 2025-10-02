// Debug script to find the exact follower count element
// Run this in the browser console on your X profile page (https://x.com/heygauravbhatia)

console.log('🔍 Debugging follower count extraction...');

// Function to find all elements that might contain follower count
function findFollowerElements() {
  console.log('\n=== SEARCHING FOR FOLLOWER ELEMENTS ===');
  
  // Common selectors for follower count
  const selectors = [
    'a[href*="/followers"]',
    'a[href*="/verified_followers"]',
    '[data-testid*="follow"]',
    '[data-testid*="follower"]',
    'span:contains("Followers")',
    'span:contains("follower")',
    'div:contains("Followers")',
    'div:contains("follower")'
  ];
  
  selectors.forEach((selector, index) => {
    try {
      const elements = document.querySelectorAll(selector);
      console.log(`\n${index + 1}. Selector: ${selector}`);
      console.log(`   Found ${elements.length} elements`);
      
      elements.forEach((el, i) => {
        console.log(`   Element ${i + 1}:`, el);
        console.log(`   Text content: "${el.textContent?.trim()}"`);
        console.log(`   HTML: ${el.outerHTML.substring(0, 200)}...`);
        
        // Look for numbers in the text
        const numbers = el.textContent?.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          console.log(`   ⭐ Numbers found: ${numbers.join(', ')}`);
        }
      });
    } catch (error) {
      console.log(`   ❌ Error with selector: ${error.message}`);
    }
  });
}

// Function to search for elements containing specific text
function searchByText() {
  console.log('\n=== SEARCHING BY TEXT CONTENT ===');
  
  const texts = ['Followers', 'follower', 'Following', 'following'];
  
  texts.forEach(text => {
    console.log(`\nSearching for elements containing "${text}":`);
    
    // Search all elements
    const allElements = document.querySelectorAll('*');
    const matches = [];
    
    allElements.forEach(el => {
      if (el.textContent && el.textContent.includes(text)) {
        matches.push(el);
      }
    });
    
    console.log(`Found ${matches.length} elements containing "${text}"`);
    
    matches.slice(0, 5).forEach((el, i) => {
      console.log(`  ${i + 1}. Element:`, el.tagName, el.className);
      console.log(`     Text: "${el.textContent?.trim()}"`);
      console.log(`     HTML: ${el.outerHTML.substring(0, 150)}...`);
      
      // Check if it contains numbers
      const numbers = el.textContent?.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        console.log(`     ⭐ Numbers: ${numbers.join(', ')}`);
      }
    });
  });
}

// Function to find elements with specific patterns
function findPatterns() {
  console.log('\n=== SEARCHING FOR SPECIFIC PATTERNS ===');
  
  // Look for links that might contain follower info
  const links = document.querySelectorAll('a');
  const followerLinks = [];
  
  links.forEach(link => {
    const href = link.href;
    const text = link.textContent?.trim();
    
    if (href && (href.includes('/followers') || href.includes('/following'))) {
      followerLinks.push({ link, href, text });
    }
  });
  
  console.log(`\nFound ${followerLinks.length} follower/following links:`);
  followerLinks.forEach((item, i) => {
    console.log(`  ${i + 1}. Href: ${item.href}`);
    console.log(`     Text: "${item.text}"`);
    console.log(`     Element:`, item.link);
    console.log(`     HTML: ${item.link.outerHTML.substring(0, 200)}...`);
    
    // Look for numbers in the text
    const numbers = item.text?.match(/\d+/g);
    if (numbers && numbers.length > 0) {
      console.log(`     ⭐ Numbers found: ${numbers.join(', ')}`);
    }
  });
}

// Function to get the current page info
function getPageInfo() {
  console.log('\n=== PAGE INFORMATION ===');
  console.log('Current URL:', window.location.href);
  console.log('Page title:', document.title);
  
  // Check if we're on a profile page
  const isProfilePage = /(twitter\.com|x\.com)\/[^\/]+\/?$/.test(window.location.href) && 
                       !window.location.href.includes('/home') && 
                       !window.location.href.includes('/explore') && 
                       !window.location.href.includes('/notifications');
  console.log('Is profile page:', isProfilePage);
}

// Run all searches
getPageInfo();
findFollowerElements();
searchByText();
findPatterns();

console.log('\n=== MANUAL INSPECTION GUIDE ===');
console.log('1. Right-click on the follower count element');
console.log('2. Select "Inspect Element"');
console.log('3. Copy the element\'s outerHTML');
console.log('4. Share the HTML structure with the developer');

console.log('\n🔍 Follower count debugging completed!');
