/**
 * X Profile Data Extractor
 * Extracts profile information from X/Twitter pages for LLM context
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
      console.log('🔍 Starting X profile data extraction...');
      
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
    const profilePattern = /(twitter\.com|x\.com)\/[^\/]+\/?$/;
    const notHomePage = !url.includes('/home') && !url.includes('/explore') && !url.includes('/notifications');
    
    return profilePattern.test(url) && notHomePage;
  }

  /**
   * Wait for page elements to load
   */
  async waitForPageLoad() {
    const maxWait = 5000; // 5 seconds max
    const checkInterval = 200;
    let waited = 0;

    while (waited < maxWait) {
      // Check if key profile elements are loaded
      const handleElement = document.querySelector('[data-testid="UserName"]');
      const bioElement = document.querySelector('[data-testid="UserDescription"]');
      
      if (handleElement && bioElement) {
        console.log('✅ Profile elements loaded');
        break;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }
  }

  /**
   * Extract X handle/username
   */
  extractHandle() {
    try {
      // Try multiple selectors for handle
      const selectors = [
        '[data-testid="UserName"] a[href*="/"]',
        '[data-testid="UserName"] span',
        'h1[data-testid="UserName"] a',
        '.css-1dbjc4n.r-1wbh5a2.r-dnmrzs.r-1ny4l3l a[href*="/"]'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim() || '';
          if (text.startsWith('@')) {
            return text;
          } else if (text && !text.includes(' ')) {
            return '@' + text;
          }
        }
      }

      // Fallback: extract from URL
      const urlMatch = window.location.pathname.match(/\/([^\/]+)\/?$/);
      if (urlMatch) {
        return '@' + urlMatch[1];
      }

      return null;
    } catch (error) {
      console.error('Error extracting handle:', error);
      return null;
    }
  }

  /**
   * Extract display name
   */
  extractDisplayName() {
    try {
      const selectors = [
        '[data-testid="UserName"] h1',
        '[data-testid="UserName"] div[dir="ltr"]',
        'h1[data-testid="UserName"] span'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent?.trim()) {
          return element.textContent.trim();
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting display name:', error);
      return null;
    }
  }

  /**
   * Extract bio/description
   */
  extractBio() {
    try {
      const selectors = [
        '[data-testid="UserDescription"]',
        '[data-testid="UserDescription"] div',
        '.css-1dbjc4n.r-16dba41.r-bcqeeo.r-bnwqim.r-13qz1uu div'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent?.trim()) {
          return element.textContent.trim();
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting bio:', error);
      return null;
    }
  }

  /**
   * Extract location
   */
  extractLocation() {
    try {
      const selectors = [
        '[data-testid="UserProfileHeader_Items"] a[href*="place"]',
        '[data-testid="UserProfileHeader_Items"] span',
        '.css-1dbjc4n.r-16dba41.r-bcqeeo.r-bnwqim.r-13qz1uu a[href*="place"]'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent?.trim()) {
          return element.textContent.trim();
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting location:', error);
      return null;
    }
  }

  /**
   * Extract website
   */
  extractWebsite() {
    try {
      const selectors = [
        '[data-testid="UserProfileHeader_Items"] a[href^="http"]',
        '[data-testid="UserUrl"]',
        '.css-1dbjc4n.r-16dba41.r-bcqeeo.r-bnwqim.r-13qz1uu a[href^="http"]'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.href && element.href.startsWith('http')) {
          return element.href;
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting website:', error);
      return null;
    }
  }

  /**
   * Extract join date
   */
  extractJoinDate() {
    try {
      // First try to find time elements with datetime attributes
      const timeSelectors = [
        '[data-testid="UserProfileHeader_Items"] time',
        '.css-1dbjc4n.r-16dba41.r-bcqeeo.r-bnwqim.r-13qz1uu time'
      ];

      for (const selector of timeSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const datetime = element.getAttribute('datetime');
          if (datetime) {
            return new Date(datetime).toISOString();
          }
        }
      }

      // If no time element found, look for spans that contain "Joined" text
      const spanSelectors = [
        '[data-testid="UserProfileHeader_Items"] span',
        '.css-1dbjc4n.r-16dba41.r-bcqeeo.r-bnwqim.r-13qz1uu span'
      ];

      for (const selector of spanSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          const text = element.textContent?.trim();
          if (text && text.includes('Joined')) {
            // Try to parse relative date like "Joined March 2010"
            const dateMatch = text.match(/Joined (.+)/);
            if (dateMatch) {
              const dateStr = dateMatch[1];
              const date = new Date(dateStr);
              if (!isNaN(date.getTime())) {
                return date.toISOString();
              }
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting join date:', error);
      return null;
    }
  }

    /**
     * Extract follower count with comprehensive search
     */
    extractFollowerCount() {
      try {
        console.log('🔍 Starting comprehensive follower count extraction...');
        
        // Method 1: Search by link href patterns
        const followerCount = this.extractFollowerCountByLinks();
        if (followerCount > 0) {
          console.log(`✅ Found follower count via links: ${followerCount}`);
          return followerCount;
        }
        
        // Method 2: Search by text patterns
        const textCount = this.extractFollowerCountByText();
        if (textCount > 0) {
          console.log(`✅ Found follower count via text: ${textCount}`);
          return textCount;
        }
        
        // Method 3: Search by data attributes
        const dataCount = this.extractFollowerCountByData();
        if (dataCount > 0) {
          console.log(`✅ Found follower count via data: ${dataCount}`);
          return dataCount;
        }
        
        console.log('⚠️ Could not extract follower count with any method');
        return 0;
      } catch (error) {
        console.error('Error extracting follower count:', error);
        return 0;
      }
    }

    /**
     * Extract follower count by searching for follower links
     */
    extractFollowerCountByLinks() {
      const linkSelectors = [
        'a[href*="/followers"]',
        'a[href*="/verified_followers"]',
        'a[href*="/following"]'
      ];

      for (const selector of linkSelectors) {
        const links = document.querySelectorAll(selector);
        console.log(`🔍 Found ${links.length} links with selector: ${selector}`);
        
        for (const link of links) {
          console.log(`🔍 Processing link: ${link.href}`);
          console.log(`🔍 Link text: "${link.textContent?.trim()}"`);
          
          // Look for spans inside the link
          const spans = link.querySelectorAll('span');
          console.log(`🔍 Found ${spans.length} spans in link`);
          
          for (const span of spans) {
            const text = span.textContent?.trim();
            console.log(`🔍 Span text: "${text}"`);
            
            if (text && !text.toLowerCase().includes('followers') && !text.toLowerCase().includes('following')) {
              const count = this.parseCount(text);
              if (count > 0) {
                console.log(`✅ Found count in span: ${count}`);
                return count;
              }
            }
          }
        }
      }
      
      return 0;
    }

    /**
     * Extract follower count by searching for text patterns
     */
    extractFollowerCountByText() {
      const allElements = document.querySelectorAll('*');
      const candidates = [];
      
      allElements.forEach(el => {
        const text = el.textContent?.trim();
        if (text && text.match(/\d+/) && (text.toLowerCase().includes('followers') || text.toLowerCase().includes('following'))) {
          candidates.push({ element: el, text: text });
        }
      });
      
      console.log(`🔍 Found ${candidates.length} text candidates`);
      
      for (const candidate of candidates) {
        console.log(`🔍 Candidate text: "${candidate.text}"`);
        const numbers = candidate.text.match(/\d+/g);
        if (numbers && numbers.length > 0) {
          for (const number of numbers) {
            const count = parseInt(number);
            if (count > 0 && count < 1000000000) { // Reasonable follower count range
              console.log(`✅ Found count in text: ${count}`);
              return count;
            }
          }
        }
      }
      
      return 0;
    }

    /**
     * Extract follower count by data attributes
     */
    extractFollowerCountByData() {
      const dataSelectors = [
        '[data-testid*="follow"]',
        '[data-testid*="follower"]',
        '[data-count]',
        '[aria-label*="followers"]',
        '[aria-label*="following"]'
      ];

      for (const selector of dataSelectors) {
        const elements = document.querySelectorAll(selector);
        console.log(`🔍 Found ${elements.length} elements with selector: ${selector}`);
        
        for (const element of elements) {
          console.log(`🔍 Element:`, element);
          console.log(`🔍 Text: "${element.textContent?.trim()}"`);
          
          // Check data attributes
          for (const attr of element.attributes) {
            if (attr.name.startsWith('data-') || attr.name === 'aria-label') {
              console.log(`🔍 ${attr.name}: "${attr.value}"`);
              const count = this.parseCount(attr.value);
              if (count > 0) {
                console.log(`✅ Found count in attribute: ${count}`);
                return count;
              }
            }
          }
          
          // Check text content
          const text = element.textContent?.trim();
          if (text) {
            const count = this.parseCount(text);
            if (count > 0) {
              console.log(`✅ Found count in element text: ${count}`);
              return count;
            }
          }
        }
      }
      
      return 0;
    }

  /**
   * Extract following count
   */
  extractFollowingCount() {
    try {
      // Updated selectors based on the actual HTML structure
      const selectors = [
        // Target the nested span structure
        'a[href*="/following"] span span',
        'a[href*="/following"] span:first-child span',
        // Original selectors as fallbacks
        'a[href*="/following"] span',
        '[data-testid="UserProfileHeader_Items"] a[href*="/following"] span',
        'a[href*="/following"] span[dir="ltr"]'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
          if (element && element.textContent?.trim()) {
            const text = element.textContent.trim();
            // Skip if this is the "Following" label text
            if (text.toLowerCase() === 'followers' || text.toLowerCase() === 'following') {
              continue;
            }
            // Try to parse as a number
            const count = this.parseCount(text);
            if (count > 0) {
              console.log(`✅ Found following count: ${count} using selector: ${selector}`);
              return count;
            }
          }
        }
      }

      console.log('⚠️ Could not extract following count with any selector');
      return 0;
    } catch (error) {
      console.error('Error extracting following count:', error);
      return 0;
    }
  }

  /**
   * Extract verified status
   */
  extractVerifiedStatus() {
    try {
      const verifiedSelectors = [
        '[data-testid="icon-verified"]',
        '[aria-label*="Verified account"]',
        'svg[data-testid="icon-verified"]'
      ];

      for (const selector of verifiedSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          return true;
        }
      }

      return false;
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
      const selectors = [
        '[data-testid="UserAvatar-Container-"] img',
        '[data-testid="UserAvatar-Container-"] img[src]',
        'img[alt*="profile picture"]'
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.src) {
          return element.src;
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting profile image:', error);
      return null;
    }
  }

  /**
   * Extract pinned tweet
   */
  extractPinnedTweet() {
    try {
      const pinnedSelectors = [
        '[data-testid="tweet"] [data-testid="socialContext"]',
        '[data-testid="tweet"] [aria-label*="Pinned"]',
        '.css-1dbjc4n.r-1igl3o0.r-qklmqi.r-1adg3ll.r-1ny4l3l [data-testid="socialContext"]'
      ];

      for (const selector of pinnedSelectors) {
        const pinnedElement = document.querySelector(selector);
        if (pinnedElement && pinnedElement.textContent?.includes('Pinned')) {
          const tweetElement = pinnedElement.closest('[data-testid="tweet"]');
          if (tweetElement) {
            const contentElement = tweetElement.querySelector('[data-testid="tweetText"]');
            const timeElement = tweetElement.querySelector('time');
            
            if (contentElement) {
              return {
                content: contentElement.textContent?.trim() || '',
                createdAt: timeElement?.getAttribute('datetime') || new Date().toISOString()
              };
            }
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting pinned tweet:', error);
      return null;
    }
  }

  /**
   * Extract recent tweets for tone analysis
   */
  extractRecentTweets() {
    try {
      const tweets = [];
      const tweetElements = document.querySelectorAll('[data-testid="tweet"]');
      
      // Limit to first 10 tweets for performance
      const maxTweets = Math.min(tweetElements.length, 10);
      
      for (let i = 0; i < maxTweets; i++) {
        const tweetElement = tweetElements[i];
        
        // Skip pinned tweet (already extracted separately)
        const pinnedContext = tweetElement.querySelector('[data-testid="socialContext"]');
        if (pinnedContext && pinnedContext.textContent?.includes('Pinned')) {
          continue;
        }

        const contentElement = tweetElement.querySelector('[data-testid="tweetText"]');
        const timeElement = tweetElement.querySelector('time');
        const engagementElement = tweetElement.querySelector('[data-testid="reply"]') || 
                                 tweetElement.querySelector('[data-testid="retweet"]') ||
                                 tweetElement.querySelector('[data-testid="like"]');

        if (contentElement && contentElement.textContent?.trim()) {
          tweets.push({
            content: contentElement.textContent.trim(),
            createdAt: timeElement?.getAttribute('datetime') || new Date().toISOString(),
            engagement: this.extractEngagementScore(tweetElement)
          });
        }
      }

      return tweets;
    } catch (error) {
      console.error('Error extracting recent tweets:', error);
      return [];
    }
  }

  /**
   * Extract engagement score from tweet element
   */
  extractEngagementScore(tweetElement) {
    try {
      let score = 0;
      
      // Count replies
      const replyElement = tweetElement.querySelector('[data-testid="reply"] span');
      if (replyElement && replyElement.textContent) {
        score += this.parseCount(replyElement.textContent) * 1;
      }

      // Count retweets
      const retweetElement = tweetElement.querySelector('[data-testid="retweet"] span');
      if (retweetElement && retweetElement.textContent) {
        score += this.parseCount(retweetElement.textContent) * 2;
      }

      // Count likes
      const likeElement = tweetElement.querySelector('[data-testid="like"] span');
      if (likeElement && likeElement.textContent) {
        score += this.parseCount(likeElement.textContent) * 1;
      }

      return score;
    } catch (error) {
      console.error('Error extracting engagement score:', error);
      return 0;
    }
  }

  /**
   * Parse count strings like "1.2K", "5M", etc.
   */
  parseCount(text) {
    try {
      if (!text) return 0;
      
      const cleanText = text.replace(/[^\d.,KMB]/g, '');
      const num = parseFloat(cleanText.replace(',', ''));
      
      if (cleanText.includes('K')) {
        return Math.round(num * 1000);
      } else if (cleanText.includes('M')) {
        return Math.round(num * 1000000);
      } else if (cleanText.includes('B')) {
        return Math.round(num * 1000000000);
      }
      
      return Math.round(num) || 0;
    } catch (error) {
      console.error('Error parsing count:', error);
      return 0;
    }
  }

  /**
   * Get extracted profile data
   */
  getProfileData() {
    return this.profileData;
  }

  /**
   * Clear extracted profile data
   */
  clearProfileData() {
    this.profileData = null;
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = XProfileExtractor;
} else {
  window.XProfileExtractor = XProfileExtractor;
}
