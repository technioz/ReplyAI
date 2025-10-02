/**
 * Simple X Profile Data Extractor - Test Version
 * This is a simplified version to test if the extension loading works
 */

console.log('🔍 profileExtractor-simple.js loaded successfully!');

class XProfileExtractor {
  constructor() {
    console.log('✅ XProfileExtractor constructor called');
    this.profileData = null;
    this.isExtracting = false;
  }

  /**
   * Extract follower count - simplified version
   */
  extractFollowerCount() {
    console.log('🔍 Testing follower count extraction...');
    
    try {
      // Try the most basic selector first
      const followerLink = document.querySelector('a[href*="/followers"]');
      if (followerLink) {
        console.log('✅ Found follower link:', followerLink);
        
        // Look for spans inside the link
        const spans = followerLink.querySelectorAll('span');
        console.log('📊 Found spans in follower link:', spans.length);
        
        for (let i = 0; i < spans.length; i++) {
          const span = spans[i];
          const text = span.textContent?.trim();
          console.log(`Span ${i}: "${text}"`);
          
          if (text && text.match(/^\d+$/)) {
            const count = parseInt(text);
            console.log(`✅ Found numeric text: ${count}`);
            return count;
          }
        }
      } else {
        console.log('❌ No follower link found');
      }
      
      return 0;
    } catch (error) {
      console.error('❌ Error extracting follower count:', error);
      return 0;
    }
  }

  /**
   * Extract handle - simplified version
   */
  extractHandle() {
    console.log('🔍 Testing handle extraction...');
    
    try {
      const handleElement = document.querySelector('[data-testid="UserName"]');
      if (handleElement) {
        const handleText = handleElement.textContent?.trim();
        console.log('✅ Found handle element:', handleText);
        
        if (handleText && handleText.startsWith('@')) {
          return handleText.substring(1); // Remove @
        }
      }
      
      console.log('❌ No handle found');
      return null;
    } catch (error) {
      console.error('❌ Error extracting handle:', error);
      return null;
    }
  }

  /**
   * Test extraction method
   */
  testExtraction() {
    console.log('🧪 Running test extraction...');
    
    const results = {
      handle: this.extractHandle(),
      followerCount: this.extractFollowerCount()
    };
    
    console.log('📊 Test results:', results);
    return results;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = XProfileExtractor;
} else {
  window.XProfileExtractor = XProfileExtractor;
  console.log('✅ XProfileExtractor added to window object');
}

console.log('✅ profileExtractor-simple.js loaded and ready!');
