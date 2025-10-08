/**
 * X Profile Data Extractor
 * Extracts profile information from X/Twitter pages for LLM context
 * Version 2.0 - Completely rewritten for reliability
 */

class XProfileExtractor {
  constructor() {
    this.profileData = null;
    this.isExtracting = false;
    this.maxRetries = 3;
    this.retryDelay = 1000;
  }

  /**
   * Main method to extract profile data from current page
   */
  async extractProfileData() {
    if (this.isExtracting) {
      console.log('🔄 Profile extraction already in progress');
      return null;
    }

    this.isExtracting = true;
    
    try {
      console.log('🔍 Starting X profile data extraction v2.0...');
      
      // Check if we're on a profile page
      if (!this.isProfilePage()) {
        console.log('❌ Not on a profile page, skipping extraction');
        return null;
      }

      // Wait for page to be fully loaded
      await this.waitForPageLoad();

      const profileData = {
        xHandle: this.extractHandle(),
        displayName: this.extractDisplayName(),
        bio: this.extractBio(),
        location: this.extractLocation(),
        website: this.extractWebsite(),
        joinDate: this.extractJoinDate(),
        followerCount: this.extractFollowerCount(),
        followingCount: this.extractFollowingCount(),
        verified: this.extractVerifiedStatus(),
        profileImageUrl: this.extractProfileImage(),
        pinnedTweet: this.extractPinnedTweet(),
        recentTweets: this.extractRecentTweets(),
        extractedAt: new Date().toISOString(),
        pageUrl: window.location.href
      };

      // Validate extracted data
      if (!profileData.xHandle) {
        throw new Error('Could not extract X handle - profile may not be loaded');
      }

      console.log('✅ Profile data extracted successfully:', profileData);
      this.profileData = profileData;
      return profileData;

    } catch (error) {
      console.error('❌ Profile extraction failed:', error);
      return null;
    } finally {
      this.isExtracting = false;
    }
  }

  /**
   * Check if current page is a profile page
   */
  isProfilePage() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    
    // More comprehensive profile page detection
    const isProfile = (
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
    
    console.log('🔍 Profile page check:', { url, pathname, isProfile });
    return isProfile;
  }

  /**
   * Wait for page elements to load with better reliability
   */
  async waitForPageLoad() {
    const maxWait = 10000; // 10 seconds max
    const checkInterval = 300;
    let waited = 0;

    console.log('⏳ Waiting for profile elements to load...');

    while (waited < maxWait) {
      // Check if key profile elements are loaded
      const criticalElements = [
        document.querySelector('[data-testid="UserName"]'),
        document.querySelector('a[href*="/followers"]'),
        document.querySelector('a[href*="/following"]')
      ];
      
      const loadedCount = criticalElements.filter(el => el !== null).length;
      console.log(`⏳ Loaded ${loadedCount}/3 critical elements (${waited}ms)`);
      
      if (loadedCount >= 2) {
        console.log('✅ Profile elements loaded');
        // Wait a bit more for content to settle
        await new Promise(resolve => setTimeout(resolve, 500));
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    console.log('⚠️ Timeout waiting for elements, proceeding anyway...');
  }

  /**
   * Extract X handle/username
   */
  extractHandle() {
    try {
      console.log('🔍 Extracting handle...');
      
      // Method 1: From URL (most reliable)
      const urlMatch = window.location.pathname.match(/\/([^\/]+)\/?$/);
      if (urlMatch && urlMatch[1]) {
        const handle = '@' + urlMatch[1];
        console.log(`✅ Extracted handle from URL: ${handle}`);
        return handle;
      }

      // Method 2: From page elements
      const selectors = [
        '[data-testid="UserName"] [href*="/"]',
        '[data-testid="UserName"] span[tabindex]',
        'a[role="link"][href*="/"][tabindex="0"]'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent?.trim();
          if (text && text.startsWith('@')) {
            console.log(`✅ Extracted handle from element: ${text}`);
            return text;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error extracting handle:', error);
      return null;
    }
  }

  /**
   * Extract display name
   */
  extractDisplayName() {
    try {
      console.log('🔍 Extracting display name...');
      
      const selectors = [
        '[data-testid="UserName"] span[style*="text-overflow"]',
        '[data-testid="UserName"] div[dir="ltr"] span',
        'h2[role="heading"] span'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          // Make sure it's not the handle
          if (text && !text.startsWith('@') && text.length > 0) {
            console.log(`✅ Extracted display name: ${text}`);
            return text;
          }
        }
      }

      return null;
    } catch (error) {
      console.error('❌ Error extracting display name:', error);
      return null;
    }
  }

  /**
   * Extract bio/description
   */
  extractBio() {
    try {
      console.log('🔍 Extracting bio...');
      
      const bioElement = document.querySelector('[data-testid="UserDescription"]');
      if (bioElement) {
        const bio = bioElement.textContent?.trim() || '';
        console.log(`✅ Extracted bio (${bio.length} chars)`);
        return bio;
      }

      return '';
    } catch (error) {
      console.error('❌ Error extracting bio:', error);
      return '';
    }
  }

  /**
   * Extract location
   */
  extractLocation() {
    try {
      const locationElement = document.querySelector('[data-testid="UserLocation"]');
      return locationElement ? locationElement.textContent?.trim() || '' : '';
    } catch (error) {
      console.error('Error extracting location:', error);
      return '';
    }
  }

  /**
   * Extract website
   */
  extractWebsite() {
    try {
      const websiteElement = document.querySelector('[data-testid="UserUrl"] a');
      return websiteElement ? websiteElement.getAttribute('href') || '' : '';
    } catch (error) {
      console.error('Error extracting website:', error);
      return '';
    }
  }

  /**
   * Extract join date
   */
  extractJoinDate() {
    try {
      const joinDateElement = document.querySelector('[data-testid="UserJoinDate"]');
      if (joinDateElement) {
        const text = joinDateElement.textContent?.trim();
        if (text) {
          // Try to parse the date
          const dateMatch = text.match(/Joined (.+)/);
          if (dateMatch) {
            const dateStr = dateMatch[1];
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              return date.toISOString();
            }
          }
          return text;
        }
      }
      return null;
    } catch (error) {
      console.error('Error extracting join date:', error);
      return null;
    }
  }

  /**
   * Extract follower count - COMPLETELY REWRITTEN
   */
  extractFollowerCount() {
    try {
      console.log('🔍 Extracting follower count...');
      
      // Find all links that point to followers
      const followerLinks = document.querySelectorAll('a[href$="/followers"], a[href$="/verified_followers"]');
      console.log(`📊 Found ${followerLinks.length} follower links`);
      
      for (const link of followerLinks) {
        console.log(`🔍 Checking link: ${link.href}`);
        
        // Get the full text of the link
        const fullText = link.textContent?.trim() || '';
        console.log(`📝 Full text: "${fullText}"`);
        
        // Try to extract just the number part
        // X format is typically like "96 Followers" or just numbers in spans
        
        // Method 1: Look for number before "Followers" text
        const numberMatch = fullText.match(/^([\d,\.]+K?M?B?)\s*(Follower|Following)/i);
        if (numberMatch) {
          const count = this.parseCount(numberMatch[1]);
          if (count > 0) {
            console.log(`✅ Found follower count (method 1): ${count}`);
            return count;
          }
        }
        
        // Method 2: Look for nested spans with just numbers
        const spans = link.querySelectorAll('span');
        console.log(`🔍 Found ${spans.length} spans in link`);
        
        for (const span of spans) {
          const spanText = span.textContent?.trim() || '';
          console.log(`📝 Span text: "${spanText}"`);
          
          // Check if this span contains ONLY a number (no "Followers" text)
          if (spanText && !spanText.toLowerCase().includes('follower') && 
              !spanText.toLowerCase().includes('following')) {
            const count = this.parseCount(spanText);
            if (count > 0 && count < 1000000000) {
              console.log(`✅ Found follower count (method 2): ${count}`);
              return count;
            }
          }
        }
      }
      
      console.log('⚠️ Could not extract follower count');
      return 0;
    } catch (error) {
      console.error('❌ Error extracting follower count:', error);
      return 0;
    }
  }

  /**
   * Extract following count
   */
  extractFollowingCount() {
    try {
      console.log('🔍 Extracting following count...');
      
      const followingLinks = document.querySelectorAll('a[href$="/following"]');
      console.log(`📊 Found ${followingLinks.length} following links`);
      
      for (const link of followingLinks) {
        const fullText = link.textContent?.trim() || '';
        console.log(`📝 Full text: "${fullText}"`);
        
        // Method 1: Look for number before "Following" text
        const numberMatch = fullText.match(/^([\d,\.]+K?M?B?)\s*Following/i);
        if (numberMatch) {
          const count = this.parseCount(numberMatch[1]);
          if (count > 0) {
            console.log(`✅ Found following count (method 1): ${count}`);
            return count;
          }
        }
        
        // Method 2: Look for nested spans with just numbers
        const spans = link.querySelectorAll('span');
        for (const span of spans) {
          const spanText = span.textContent?.trim() || '';
          
          if (spanText && !spanText.toLowerCase().includes('follower') && 
              !spanText.toLowerCase().includes('following')) {
            const count = this.parseCount(spanText);
            if (count > 0 && count < 1000000000) {
              console.log(`✅ Found following count (method 2): ${count}`);
              return count;
            }
          }
        }
      }
      
      console.log('⚠️ Could not extract following count');
      return 0;
    } catch (error) {
      console.error('❌ Error extracting following count:', error);
      return 0;
    }
  }

  /**
   * Parse count string (handles K, M, B suffixes and commas)
   */
  parseCount(text) {
    if (!text) return 0;
    
    // Remove commas and spaces
    text = text.toString().replace(/[,\s]/g, '');
    
    // Check for K, M, B suffixes
    const multipliers = {
      'K': 1000,
      'M': 1000000,
      'B': 1000000000
    };
    
    for (const [suffix, multiplier] of Object.entries(multipliers)) {
      if (text.toUpperCase().endsWith(suffix)) {
        const num = parseFloat(text.slice(0, -1));
        return Math.round(num * multiplier);
      }
    }
    
    // Try to parse as regular number
    const num = parseInt(text);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Extract verified status
   */
  extractVerifiedStatus() {
    try {
      // Look for verified badge
      const verifiedBadge = document.querySelector('[data-testid="UserName"] svg[aria-label*="Verified"]');
      return verifiedBadge !== null;
    } catch (error) {
      console.error('Error extracting verified status:', error);
      return false;
    }
  }

  /**
   * Extract profile image URL
   */
  extractProfileImage() {
    try {
      const profileImg = document.querySelector('a[href$="/photo"] img, [data-testid="UserAvatar"] img');
      return profileImg ? profileImg.getAttribute('src') || '' : '';
    } catch (error) {
      console.error('Error extracting profile image:', error);
      return '';
    }
  }

  /**
   * Extract pinned tweet
   */
  extractPinnedTweet() {
    try {
      const pinnedTweet = document.querySelector('[data-testid="pinnedTweet"]');
      if (pinnedTweet) {
        const tweetText = pinnedTweet.querySelector('[data-testid="tweetText"]');
        return tweetText ? tweetText.textContent?.trim() || '' : '';
      }
      return '';
    } catch (error) {
      console.error('Error extracting pinned tweet:', error);
      return '';
    }
  }

  /**
   * Extract recent tweets for tone analysis
   */
  extractRecentTweets() {
    try {
      const tweets = [];
      const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
      
      // Limit to first 5 tweets
      const limit = Math.min(5, tweetElements.length);
      
      for (let i = 0; i < limit; i++) {
        const tweet = tweetElements[i];
        const tweetText = tweet.querySelector('[data-testid="tweetText"]');
        
        if (tweetText) {
          const text = tweetText.textContent?.trim();
          if (text) {
            tweets.push({
              text: text,
              length: text.length,
              timestamp: new Date().toISOString() // Could extract actual timestamp
            });
          }
        }
      }
      
      console.log(`✅ Extracted ${tweets.length} recent tweets`);
      return tweets;
    } catch (error) {
      console.error('Error extracting recent tweets:', error);
      return [];
    }
  }
}

// Export for both browser and Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = XProfileExtractor;
} else {
  window.XProfileExtractor = XProfileExtractor;
  console.log('✅ XProfileExtractor v2.0 loaded successfully');
}
