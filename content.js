// Quirkly Content Script - Premium Authentication & AI Integration
console.log('🚀 Quirkly Content Script: Script loaded and starting...');

class Quirkly {
  constructor() {
    console.log('🚀 Quirkly: Constructor called');
    this.apiKey = null;
    this.user = null;
    this.isEnabled = false;
    
    try {
      this.config = QuirklyConfig.getConfig();
      console.log('🚀 Quirkly: Config loaded successfully:', this.config);
    } catch (error) {
      console.error('🚀 Quirkly: Failed to load config:', error);
      // Use fallback config
      this.config = {
        environment: 'development',
        authUrl: 'http://localhost:3000/api/auth/validate',
        replyUrl: 'http://localhost:3000/api/reply/generate',
        dashboardUrl: 'http://localhost:3000',
        isDev: true
      };
      console.log('🚀 Quirkly: Using fallback config:', this.config);
    }
    
    this.observer = null;
    this.initialized = false;
    this.lastCheck = 0;
    this.checkInterval = 2000; // Check every 2 seconds
    this.periodicSearchInterval = null;
    
    console.log('🚀 Quirkly: Constructor completed, calling init...');
    
    // Initialize the extension
    this.init();
  }

  // Handle extension context invalidation gracefully
  handleContextInvalidationGracefully() {
    console.log('Quirkly: Handling extension context invalidation gracefully...');
    
    // Show user-friendly message
    this.showError('Extension connection lost. Please refresh the page to reconnect.');
    
    // Remove all buttons to prevent further errors
    this.removeAllButtons();
    
    // Show authentication notice to guide user
    setTimeout(() => {
      this.showAuthenticationNotice();
    }, 2000);
    
    // Try to reload the extension after a delay
    setTimeout(() => {
      try {
        if (chrome.runtime?.id) {
          chrome.runtime.reload();
        }
      } catch (error) {
        console.log('Quirkly: Auto-reload failed, manual reload required');
      }
    }, 5000);
  }

  // Check if extension context is still valid
  isExtensionContextValid() {
    return !!(chrome.runtime && chrome.runtime.id);
  }

  // Simple, direct approach to handle context invalidation
  handleContextInvalidation() {
    console.log('Extension context invalid, handling gracefully...');
    
    // Use the graceful approach
    this.handleContextInvalidationGracefully();
  }

  async init() {
    try {
      // Check if extension context is still valid
      if (!this.isExtensionContextValid()) {
        console.error('Extension context invalid during initialization');
        this.handleContextInvalidation();
        return;
      }

      console.log('Quirkly: Initializing content script...');
      
      // Load settings from storage
      await this.loadSettings();
      
      // Start monitoring for reply boxes
      this.startMonitoring();
      
      // Start settings watcher for authentication changes
      this.startSettingsWatcher();
      
      // Clean up any duplicate buttons that might exist
      this.cleanupDuplicateButtons();
      this.cleanupOrphanedButtons(); // Clean up orphaned buttons
      
      // Add a test button to verify extension is working
      this.addTestButton();
      
      console.log('Quirkly: Content script initialized successfully');
    } catch (error) {
      if (error.message?.includes('Extension context invalidated')) {
        console.log('Quirkly: Extension context invalidated during initialization');
        this.handleContextInvalidation();
        return;
      }
      console.error('Quirkly: Initialization failed:', error);
    }
  }

  async loadSettings() {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.log('Quirkly: Extension context invalidated, stopping initialization');
        return;
      }

      const result = await chrome.storage.sync.get(['apiKey', 'isEnabled', 'user']);
      this.apiKey = result.apiKey || '';
      this.isEnabled = result.isEnabled !== false;
      this.user = result.user || null;
      this.isAuthenticated = !!(this.apiKey && this.user);
      
      console.log('Quirkly settings loaded:', { 
        hasApiKey: !!this.apiKey, 
        isEnabled: this.isEnabled, 
        hasUser: !!this.user,
        isAuthenticated: this.isAuthenticated
      });

      // Show authentication notice if not authenticated
      if (!this.isAuthenticated) {
        console.log('Quirkly: Not authenticated, showing notice');
        this.showAuthenticationNotice();
      } else {
        console.log('Quirkly: Authenticated, starting button injection');
        // Clean up any existing buttons first
        this.cleanupDuplicateButtons();
        this.cleanupOrphanedButtons(); // Clean up orphaned buttons
        // Force immediate search for reply boxes
        setTimeout(() => this.searchForReplyBoxes(), 1000);
      }
    } catch (error) {
      if (error.message?.includes('Extension context invalidated')) {
        console.log('Quirkly: Extension context invalidated, stopping execution');
        return;
      }
      console.error('Error loading Quirkly settings:', error);
      this.isAuthenticated = false;
      this.isEnabled = false;
    }
  }

  showAuthenticationNotice() {
    // Don't show multiple notices
    if (document.querySelector('.quirkly-auth-notice')) {
      return;
    }

    // Show a subtle notice that the user needs to authenticate
    const notice = document.createElement('div');
    notice.className = 'quirkly-auth-notice';
    notice.innerHTML = `
      <div class="quirkly-auth-notice-content">
        <i class="fas fa-robot"></i>
        <div class="notice-text">
          <strong>Quirkly Extension</strong>
          <p>Click the extension icon to authenticate and start generating AI replies!</p>
        </div>
        <button class="quirkly-auth-notice-close" title="Close">&times;</button>
      </div>
    `;
    
    notice.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #6D5EF8, #22D3EE);
      color: white;
      padding: 16px;
      border-radius: 12px;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      max-width: 320px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      animation: slideInRight 0.3s ease-out;
      cursor: pointer;
      transition: transform 0.2s ease;
    `;
    
    const content = notice.querySelector('.quirkly-auth-notice-content');
    content.style.cssText = `
      display: flex;
      align-items: flex-start;
      gap: 12px;
    `;

    const noticeText = notice.querySelector('.notice-text');
    noticeText.style.cssText = `
      flex: 1;
    `;

    const noticeTextStrong = notice.querySelector('.notice-text strong');
    if (noticeTextStrong) {
      noticeTextStrong.style.cssText = `
        display: block;
        margin-bottom: 4px;
        font-weight: 700;
      `;
    }

    const noticeTextP = notice.querySelector('.notice-text p');
    if (noticeTextP) {
      noticeTextP.style.cssText = `
        margin: 0;
        font-size: 13px;
        opacity: 0.9;
        line-height: 1.3;
      `;
    }
    
    const closeBtn = notice.querySelector('.quirkly-auth-notice-close');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 4px;
      margin: -4px;
      opacity: 0.8;
      transition: opacity 0.2s ease;
    `;

    // Hover effects
    notice.addEventListener('mouseenter', () => {
      notice.style.transform = 'translateY(-2px)';
    });

    notice.addEventListener('mouseleave', () => {
      notice.style.transform = 'translateY(0)';
    });

    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.opacity = '1';
    });

    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.opacity = '0.8';
    });
    
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      notice.remove();
    });

    // Click notice to open extension popup
    notice.addEventListener('click', () => {
      // This will open the extension popup
      chrome.runtime.sendMessage({ action: 'openPopup' });
      notice.remove();
    });
    
    document.body.appendChild(notice);
    
    // Auto-remove after 15 seconds
    setTimeout(() => {
      if (notice.parentNode) {
        notice.remove();
      }
    }, 15000);
    
    // Add CSS animation if not already added
    if (!document.querySelector('#quirkly-animations')) {
      const style = document.createElement('style');
      style.id = 'quirkly-animations';
      style.textContent = `
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Periodically check for settings updates
  startSettingsWatcher() {
    const intervalId = setInterval(async () => {
      try {
        // Check if extension context is still valid
        if (!chrome.runtime?.id) {
          console.log('Quirkly: Extension context invalidated, clearing interval');
          clearInterval(intervalId);
          this.handleContextInvalidationGracefully();
          return;
        }

        // Additional context health check
        if (!this.isExtensionContextValid()) {
          console.log('Quirkly: Context health check failed, handling gracefully');
          clearInterval(intervalId);
          this.handleContextInvalidationGracefully();
          return;
        }

        const result = await chrome.storage.sync.get(['apiKey', 'isEnabled', 'user']);
        const newApiKey = result.apiKey || '';
        const newIsEnabled = result.isEnabled !== false;
        const newUser = result.user || null;
        const newIsAuthenticated = !!(newApiKey && newUser);
        
        // Check if authentication status changed
        if (this.isAuthenticated !== newIsAuthenticated) {
          console.log('Quirkly: Authentication status changed:', newIsAuthenticated);
          this.isAuthenticated = newIsAuthenticated;
          this.apiKey = newApiKey;
          this.user = newUser;
          this.isEnabled = newIsEnabled;
          
          if (newIsAuthenticated) {
            console.log('Quirkly: User authenticated, starting button injection');
            // Clean up any existing buttons first
            this.cleanupDuplicateButtons();
            this.cleanupOrphanedButtons(); // Clean up orphaned buttons
            // Force immediate search for reply boxes
            setTimeout(() => this.searchForReplyBoxes(), 500);
          } else {
            // Remove existing buttons if user signed out
            this.removeAllButtons();
            this.cleanupConflicts(); // Clean up any conflicts
            this.showAuthenticationNotice();
          }
          return;
        }
        
        // Update if other settings changed
        if (this.apiKey !== newApiKey || this.isEnabled !== newIsEnabled || this.user !== newUser) {
          this.apiKey = newApiKey;
          this.isEnabled = newIsEnabled;
          this.user = newUser;
          console.log('Quirkly settings updated:', { 
            hasApiKey: !!this.apiKey, 
            isEnabled: this.isEnabled, 
            hasUser: !!this.user
          });
          
          // If newly authenticated, start button injection
          if (this.isAuthenticated && this.isEnabled) {
            console.log('Quirkly: Settings updated, searching for reply boxes');
            // Clean up any existing buttons first
            this.cleanupDuplicateButtons();
            this.cleanupOrphanedButtons(); // Clean up orphaned buttons
            setTimeout(() => this.searchForReplyBoxes(), 500);
          } else if (!this.isEnabled) {
            // Clean up if extension is disabled
            this.removeAllButtons();
            this.cleanupConflicts();
          }
        }
      } catch (error) {
        if (error.message?.includes('Extension context invalidated')) {
          console.log('Quirkly: Extension context invalidated, clearing interval');
          clearInterval(intervalId);
          return;
        }
        console.error('Error checking Quirkly settings:', error);
      }
    }, 2000); // Check every 2 seconds
  }

  removeAllButtons() {
    const existingButtons = document.querySelectorAll('.quirkly-buttons');
    console.log(`Quirkly: Removing ${existingButtons.length} button containers`);
    existingButtons.forEach(buttonContainer => {
      buttonContainer.remove();
    });
    
    // Remove injected flags
    const injectedElements = document.querySelectorAll('[data-quirkly-injected]');
    console.log(`Quirkly: Removing ${injectedElements.length} injected flags`);
    injectedElements.forEach(element => {
      element.removeAttribute('data-quirkly-injected');
    });
    
    // Remove container flags
    const containerFlags = document.querySelectorAll('[data-quirkly-container]');
    console.log(`Quirkly: Removing ${containerFlags.length} container flags`);
    containerFlags.forEach(element => {
      element.removeAttribute('data-quirkly-container');
    });
  }

  // Clean up any duplicate buttons that might have been created
  cleanupDuplicateButtons() {
    try {
      const allButtons = document.querySelectorAll('.quirkly-buttons');
      if (allButtons.length <= 1) {
        return; // No duplicates
      }
      
      console.log(`Quirkly: Found ${allButtons.length} button containers, cleaning up duplicates...`);
      
      // Keep only the first button container in each parent
      const processedParents = new Set();
      
      allButtons.forEach((buttonContainer, index) => {
        const parent = buttonContainer.parentElement;
        if (processedParents.has(parent)) {
          console.log(`Quirkly: Removing duplicate button container ${index}`);
          buttonContainer.remove();
        } else {
          processedParents.add(parent);
          console.log(`Quirkly: Keeping button container ${index} in parent`);
        }
      });
      
      console.log(`Quirkly: Cleanup completed, kept ${processedParents.size} button containers`);
    } catch (error) {
      console.error('Quirkly: Error cleaning up duplicate buttons:', error);
    }
  }

  // Clean up any orphaned or misplaced button containers
  cleanupOrphanedButtons() {
    try {
      const allButtons = document.querySelectorAll('.quirkly-buttons');
      console.log(`Quirkly: Checking ${allButtons.length} button containers for orphans...`);
      
      allButtons.forEach((buttonContainer, index) => {
        const parent = buttonContainer.parentElement;
        if (parent) {
          // Check if this parent contains a valid reply box
          const hasReplyBox = parent.querySelector('[data-testid="tweetTextarea_0"], [data-testid="replyTextarea"], [data-testid="composeTextarea"]');
          if (!hasReplyBox) {
            console.log(`Quirkly: Removing orphaned button container ${index} from invalid parent`);
            buttonContainer.remove();
          }
        }
      });
      
      console.log('Quirkly: Orphaned button cleanup completed');
    } catch (error) {
      console.error('Quirkly: Error cleaning up orphaned buttons:', error);
    }
  }

  // Reset initialization flag when extension is reloaded
  resetInitializationFlag() {
    if (window.quirklyInitialized) {
      console.log('Quirkly: Resetting initialization flag');
      window.quirklyInitialized = false;
    }
  }

  // Clean up any conflicts with Twitter's code
  cleanupConflicts() {
    try {
      // Remove any elements that might conflict with Twitter's functionality
      const conflictingElements = document.querySelectorAll('[data-quirkly-extension]');
      if (conflictingElements.length > 0) {
        console.log(`Quirkly: Cleaning up ${conflictingElements.length} conflicting elements`);
        conflictingElements.forEach(element => {
          try {
            element.remove();
          } catch (error) {
            console.log('Quirkly: Error removing conflicting element:', error);
          }
        });
      }
    } catch (error) {
      console.log('Quirkly: Error cleaning up conflicts:', error);
    }
  }

  observeDOM() {
    try {
      // Only observe if we don't already have buttons
      if (document.querySelectorAll('.quirkly-buttons').length > 0) {
        console.log('Quirkly: Buttons already exist, skipping DOM observation');
        return;
      }
      
      const observer = new MutationObserver((mutations) => {
        // Stop observing if we already have buttons
        if (document.querySelectorAll('.quirkly-buttons').length > 0) {
          console.log('Quirkly: Buttons found, stopping DOM observation');
          observer.disconnect();
          return;
        }
        
        mutations.forEach((mutation) => {
          // Only process added nodes to avoid conflicts
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Skip if this is our own extension elements
                if (node.hasAttribute && (node.hasAttribute('data-quirkly-extension') || node.hasAttribute('data-quirkly-container'))) {
                  return;
                }
                
                // Skip if this is a text node or content change
                if (node.nodeType === Node.TEXT_NODE || node.nodeName === '#text') {
                  return;
                }
                
                // Use a small delay to let Twitter's code settle
                setTimeout(() => {
                  try {
                    // Double-check we still don't have buttons
                    if (document.querySelectorAll('.quirkly-buttons').length === 0) {
                      this.checkForReplyBox(node);
                    }
                  } catch (error) {
                    console.log('Quirkly: Error checking reply box:', error);
                  }
                }, 200);
              }
            });
          }
        });
      });

      // Use very conservative observation settings
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: false, // Don't watch attribute changes
        characterData: false // Don't watch text changes
      });
      
      this.observer = observer;
      
      console.log('Quirkly: DOM observer started with very conservative settings');
    } catch (error) {
      console.error('Quirkly: Failed to start DOM observer:', error);
    }
  }

  startPeriodicReplyBoxSearch() {
    // Clear any existing interval
    if (this.periodicSearchInterval) {
      clearInterval(this.periodicSearchInterval);
    }
    
    // Don't start periodic search if we already have buttons
    if (document.querySelectorAll('.quirkly-buttons').length > 0) {
      console.log('Quirkly: Buttons already exist, skipping periodic search');
      return;
    }
    
    this.periodicSearchInterval = setInterval(() => {
      if (this.isAuthenticated && this.isEnabled) {
        // Only search if we haven't found any reply boxes yet
        const existingButtons = document.querySelectorAll('.quirkly-buttons');
        if (existingButtons.length === 0) {
          console.log('Quirkly: No buttons found, searching for missed reply boxes...');
          this.searchForMissedReplyBoxes();
        } else {
          console.log(`Quirkly: Found ${existingButtons.length} button containers, stopping periodic search`);
          clearInterval(this.periodicSearchInterval);
        }
      }
    }, 15000); // Check every 15 seconds instead of 10
  }

  searchForMissedReplyBoxes() {
    const selectors = [
      '[data-testid="tweetTextarea_0"]',
      '[data-testid="tweetTextarea"]',
      '[data-testid="replyTextarea"]',
      '[data-testid="composeTextarea"]'
    ];
    
    selectors.forEach(selector => {
      const replyBoxes = document.querySelectorAll(selector);
      replyBoxes.forEach(replyBox => {
        if (!replyBox.hasAttribute('data-quirkly-injected')) {
          console.log('Found missed reply box with selector:', selector);
          this.injectButtons(replyBox);
        }
      });
    });
  }

  checkForReplyBox(node) {
    // Only proceed if authenticated and enabled
    if (!this.isAuthenticated || !this.isEnabled) {
      return;
    }
    
    // Skip if this is our own extension elements
    if (node.hasAttribute && (node.hasAttribute('data-quirkly-extension') || node.hasAttribute('data-quirkly-container'))) {
      return;
    }
    
    // Skip if we already have buttons
    if (document.querySelectorAll('.quirkly-buttons').length > 0) {
      return;
    }
    
    console.log('Checking node for reply box:', node);
    
    // Only look for the specific Twitter reply textarea
    const twitterTextarea = node.querySelector ? node.querySelector('[data-testid="tweetTextarea_0"]') : null;
    
    if (twitterTextarea && !twitterTextarea.hasAttribute('data-quirkly-injected')) {
      // Check if buttons already exist in the parent container
      const parentContainer = twitterTextarea.parentElement;
      if (parentContainer && !parentContainer.querySelector('.quirkly-buttons')) {
        console.log('Found Twitter reply textarea, injecting buttons');
        this.injectButtons(twitterTextarea);
        return;
      }
    }
    
    // Also check if the node itself is the reply box
    if (node.matches && node.matches('[data-testid="tweetTextarea_0"]')) {
      if (!node.hasAttribute('data-quirkly-injected')) {
        // Check if buttons already exist in the parent container
        const parentContainer = node.parentElement;
        if (parentContainer && !parentContainer.querySelector('.quirkly-buttons')) {
          console.log('Node itself is Twitter reply textarea, injecting buttons');
          this.injectButtons(node);
        }
      }
    }
  }

  injectButtons(replyBox) {
    console.log('Quirkly: injectButtons called with replyBox:', replyBox);
    console.log('Quirkly: isAuthenticated:', this.isAuthenticated, 'isEnabled:', this.isEnabled, 'hasApiKey:', !!this.apiKey);
    
    if (!this.isAuthenticated || !this.isEnabled || !this.apiKey) {
      console.log('Quirkly: Skipping button injection - not authenticated or disabled');
      console.log('Quirkly: Details - isAuthenticated:', this.isAuthenticated, 'isEnabled:', this.isEnabled, 'hasApiKey:', !!this.apiKey);
      return;
    }
    
    // Check if buttons already exist for this reply box
    if (replyBox.hasAttribute('data-quirkly-injected')) {
      console.log('Quirkly: Buttons already injected for this reply box, skipping');
      return;
    }
    
    // Check if buttons already exist in the parent container
    const existingButtons = replyBox.parentElement?.querySelector('.quirkly-buttons');
    if (existingButtons) {
      console.log('Quirkly: Buttons already exist in parent container, skipping');
      return;
    }
    
    // Final check: make sure we don't have buttons anywhere
    if (document.querySelectorAll('.quirkly-buttons').length > 0) {
      console.log('Quirkly: Buttons already exist somewhere, skipping injection');
      return;
    }
    
    // Debug the DOM structure
    this.debugDOMStructure(replyBox);
    
    console.log('Quirkly: Injecting buttons...');
    replyBox.setAttribute('data-quirkly-injected', 'true');

    // Create premium button container with minimal interference
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'quirkly-buttons';
    buttonContainer.setAttribute('data-quirkly-container', 'true');
    buttonContainer.setAttribute('data-quirkly-extension', 'true');
    
    // Use more Twitter-friendly styling to avoid conflicts
    buttonContainer.style.cssText = `
      display: flex;
      gap: 8px;
      margin-top: 8px;
      padding: 8px 0;
      flex-wrap: wrap;
      z-index: 1000;
      position: relative;
      pointer-events: auto;
    `;
    
    buttonContainer.innerHTML = `
      <button class="quirkly-btn" data-tone="professional" type="button" data-quirkly-btn="true">
        <span class="btn-icon">💼</span> Professional
      </button>
      <button class="quirkly-btn" data-tone="casual" type="button" data-quirkly-btn="true">
        <span class="btn-icon">😊</span> Casual
      </button>
      <button class="quirkly-btn" data-tone="humorous" type="button" data-quirkly-btn="true">
        <span class="btn-icon">😄</span> Humorous
      </button>
      <button class="quirkly-btn" data-tone="empathetic" type="button" data-quirkly-btn="true">
        <span class="btn-icon">❤️</span> Empathetic
      </button>
      <button class="quirkly-btn" data-tone="analytical" type="button" data-quirkly-btn="true">
        <span class="btn-icon">🧠</span> Analytical
      </button>
      <button class="quirkly-btn" data-tone="enthusiastic" type="button" data-quirkly-btn="true">
        <span class="btn-icon">🔥</span> Enthusiastic
      </button>
    `;

    // Insert buttons after the reply box with minimal DOM disruption
    try {
      // Use a more careful insertion method
      const parent = replyBox.parentElement;
      if (parent) {
        // Insert after the reply box, not at the end of parent
        if (replyBox.nextSibling) {
          parent.insertBefore(buttonContainer, replyBox.nextSibling);
        } else {
          parent.appendChild(buttonContainer);
        }
      }
    } catch (error) {
      console.error('Quirkly: Error inserting buttons:', error);
      return;
    }

    // Add click handlers with better event handling
    buttonContainer.querySelectorAll('.quirkly-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        console.log('Quirkly: Button clicked:', btn.dataset.tone);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Prevent Twitter's handlers from running
        
        // Check extension context before proceeding
        if (!this.isExtensionContextValid()) {
          console.error('Quirkly: Extension context invalid when button clicked');
          this.showError('Extension connection lost. Please refresh the page and try again.');
          return;
        }
        
        // Use a small delay to let Twitter's code settle
        setTimeout(() => {
          this.generateReply(btn.dataset.tone, replyBox);
        }, 100);
      });
    });
    
    console.log('Quirkly: Buttons injected successfully');
    console.log('Quirkly: Button container added to DOM:', buttonContainer);
    
    // Stop all monitoring once we have buttons
    this.stopAllMonitoring();
  }

  // Debug DOM structure for troubleshooting
  debugDOMStructure(replyBox) {
    try {
      console.log('Quirkly: Debugging DOM structure for replyBox:', replyBox);
      console.log('Quirkly: ReplyBox tagName:', replyBox.tagName);
      console.log('Quirkly: ReplyBox className:', replyBox.className);
      console.log('Quirkly: ReplyBox id:', replyBox.id);
      console.log('Quirkly: ReplyBox data attributes:', replyBox.dataset);
      console.log('Quirkly: ReplyBox parent:', replyBox.parentElement);
      console.log('Quirkly: ReplyBox parent tagName:', replyBox.parentElement?.tagName);
      console.log('Quirkly: ReplyBox parent className:', replyBox.parentElement?.className);
    } catch (error) {
      console.log('Quirkly: Error debugging DOM structure:', error);
    }
  }

  async generateReply(tone, replyBox) {
    // Check if extension context is still valid before proceeding
    if (!this.isExtensionContextValid()) {
      console.error('Extension context invalidated during reply generation');
      this.showError('Extension context lost. Please refresh the page and try again.');
      return;
    }

    console.log('=== QUIRKLY DEBUG START ===');
    console.log('Tone:', tone);
    console.log('ReplyBox:', replyBox);
    console.log('API Key available:', !!this.apiKey);
    console.log('User data:', this.user);
    
    try {
      // Simple loading state - just disable the button
      const button = document.querySelector(`[data-tone="${tone}"]`);
      if (button) {
        button.disabled = true;
        button.textContent = 'Generating...';
      }
      
      // Get original post content
      const originalPost = this.getOriginalPost();
      
      console.log('Sending message to background script for reply generation');
      
      // Check extension context again before sending message
      if (!this.isExtensionContextValid()) {
        throw new Error('Extension context invalidated before sending message to background script');
      }
      
      // Send message to background script
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'generateReply',
          tweetText: originalPost,
          tone: tone,
          userContext: {
            userId: this.user?.id,
            email: this.user?.email,
            preferences: this.user?.preferences
          }
        }, (response) => {
          // Check if extension context is still valid when receiving response
          if (!this.isExtensionContextValid()) {
            reject(new Error('Extension context invalidated while receiving response'));
            return;
          }
          
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Unknown error from background script'));
          }
        });
      });

      console.log('Background script response:', response);
      
      // Check extension context before processing reply data
      if (!this.isExtensionContextValid()) {
        throw new Error('Extension context invalidated before processing reply data');
      }
      
      // Handle the response
      let replyData = response.data;
      
      if (replyData && typeof replyData === 'object' && replyData.reply) {
        console.log('Received reply:', replyData.reply);
        
        // Use the correct method: inject directly into the reply box
        const editableContent = this.findEditableContent(replyBox);
        if (editableContent) {
          try {
            this.fillReplyBox(editableContent, replyData.reply);
            this.showSuccess('Reply generated and inserted successfully! ✨');
            
            // Additional verification: check if the reply actually appeared
            setTimeout(() => {
              this.verifyReplyInjection(replyData.reply);
            }, 1000);
          } catch (fillError) {
            console.error('Error filling reply box:', fillError);
            this.showError('Error inserting reply into text area');
          }
        } else {
          console.error('Could not find editable content in reply box');
          this.showError('Could not find text area to insert reply');
        }
        
      } else {
        throw new Error('No valid reply received');
      }
      
    } catch (error) {
      console.error('❌ Error generating reply:', error);
      
      // Handle extension context errors specifically
      if (error.message?.includes('Extension context invalidated')) {
        this.showError('Extension context lost. Please refresh the page and try again.');
        console.log('Quirkly: Extension context invalidated, user should refresh page');
      } else {
        this.showError(`Failed to generate reply: ${error.message}`);
      }
    } finally {
      // Re-enable button
      const button = document.querySelector(`[data-tone="${tone}"]`);
      if (button) {
        button.disabled = false;
        button.textContent = tone.charAt(0).toUpperCase() + tone.slice(1);
      }
    }
  }

  // Find the editable content area within the reply box
  findEditableContent(replyBox) {
    try {
      console.log('Finding editable content in:', replyBox);
      
      if (!replyBox || typeof replyBox.querySelector !== 'function') {
        console.error('Invalid replyBox provided:', replyBox);
        return null;
      }
      
      // Try multiple selectors to find the editable content area
      const selectors = [
        '.public-DraftEditor-content',
        '[contenteditable="true"]',
        '[data-testid="tweetTextarea_0"] .public-DraftEditor-content',
        '[data-testid="tweetTextarea_0"] [contenteditable="true"]'
      ];
      
      for (const selector of selectors) {
        try {
          const editableContent = replyBox.querySelector(selector);
          if (editableContent) {
            console.log('Found editable content with selector:', selector);
            return editableContent;
          }
        } catch (selectorError) {
          console.error('Error with selector:', selector, selectorError);
        }
      }
      
      // If not found in replyBox, try searching in the entire document
      console.log('Not found in replyBox, searching document...');
      for (const selector of selectors) {
        try {
          const editableContent = document.querySelector(selector);
          if (editableContent) {
            console.log('Found editable content in document with selector:', selector);
            return editableContent;
          }
        } catch (selectorError) {
          console.error('Error with document selector:', selector, selectorError);
        }
      }
      
      console.error('Could not find editable content area');
      return null;
    } catch (error) {
      console.error('Error in findEditableContent:', error);
      return null;
    }
  }

  // Fill the reply box with the generated reply text
  fillReplyBox(editableContent, replyText) {
    try {
      console.log('Filling editable content:', editableContent);
      console.log('Reply text:', replyText);
      
      if (!editableContent || typeof editableContent.querySelector !== 'function') {
        throw new Error('Invalid editable content element');
      }
      
      if (!replyText || typeof replyText !== 'string') {
        throw new Error('Invalid reply text');
      }
      
      // Find the existing div with data-offset-key (Twitter's outer container)
      const existingDiv = editableContent.querySelector('div[data-offset-key]');
    
      if (existingDiv) {
        console.log('Found existing div:', existingDiv);
        
        // Get the existing offset key to maintain Twitter's structure
        const offsetKey = existingDiv.getAttribute('data-offset-key');
        console.log('Using existing offset key:', offsetKey);
        
        // Find the actual Twitter editor ID from the existing structure
        let actualEditorId = 'quirkly'; // fallback
        const existingOuterDiv = editableContent.querySelector('div[data-editor]');
        if (existingOuterDiv) {
          actualEditorId = existingOuterDiv.getAttribute('data-editor') || 'quirkly';
          console.log('Found actual Twitter editor ID:', actualEditorId);
        } else {
          console.log('No existing editor ID found, using fallback:', actualEditorId);
        }
        
        console.log('Will use editor ID:', actualEditorId);
        
        // Create the COMPLETE Twitter structure with ALL required divs:
        // 1. Outer div: data-block="true", data-editor (Twitter's actual ID), data-offset-key
        // 2. Middle div: data-offset-key + CSS classes
        // 3. Inner span: data-offset-key
        // 4. Text span: data-text="true"
        
        const outerDiv = document.createElement('div');
        outerDiv.className = '';
        outerDiv.setAttribute('data-block', 'true');
        outerDiv.setAttribute('data-editor', actualEditorId); // Use Twitter's actual editor ID
        outerDiv.setAttribute('data-offset-key', offsetKey);
        
        const middleDiv = document.createElement('div');
        middleDiv.setAttribute('data-offset-key', offsetKey);
        middleDiv.className = 'public-DraftStyleDefault-block public-DraftStyleDefault-ltr';
        
        // Create the inner span with data-offset-key (same as parent divs)
        const innerSpan = document.createElement('span');
        innerSpan.setAttribute('data-offset-key', offsetKey);
        
        // Create the innermost span with data-text="true" containing the reply
        const textSpan = document.createElement('span');
        textSpan.setAttribute('data-text', 'true');
        textSpan.textContent = replyText;
        
        // Assemble the complete structure: outerDiv > middleDiv > innerSpan > textSpan
        innerSpan.appendChild(textSpan);
        middleDiv.appendChild(innerSpan);
        // outerDiv.appendChild(middleDiv);
        
        // console.log('Created COMPLETE Twitter structure:', outerDiv.outerHTML);
        console.log('Structure validation:', {
          'outerDiv data-block': outerDiv.getAttribute('data-block'),
          'outerDiv data-editor': outerDiv.getAttribute('data-editor'),
          'outerDiv data-offset-key': outerDiv.getAttribute('data-offset-key'),
          'middleDiv data-offset-key': middleDiv.getAttribute('data-offset-key'),
          'middleDiv className': middleDiv.className,
          'innerSpan data-offset-key': innerSpan.getAttribute('data-offset-key'),
          'textSpan data-text': textSpan.getAttribute('data-text'),
          'textContent': textSpan.textContent
        });
        
        // Replace the existing div with the new complete structure
        // Clear existing children and replace with middleDiv
        existingDiv.innerHTML = '';
        // existingDiv.appendChild(middleDiv);

        // 1. Locate the reply textarea - may need to adjust selector if Twitter updates its UI
        const textarea = document.querySelector('div[role="textbox"][data-testid="tweetTextarea_0"]'); // or similar selector

        if (textarea) {
            // 2. Set the value (for contentEditable elements, use innerText or textContent)
            textarea.focus();
            document.execCommand('insertText', false, replyText);  // works for contentEditable
            
            // 3. Optionally: dispatch input events so Twitter/X registers the change
            textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        
        console.log('Successfully replaced existing div with complete Twitter structure');
        console.log('New structure in DOM:', editableContent.querySelector(`div[data-offset-key="${offsetKey}"]`));
        console.log('New structure outerHTML:', editableContent.querySelector(`div[data-offset-key="${offsetKey}"]`)?.outerHTML);
        
        // Enhanced event triggering to make Twitter recognize this as real user input
        console.log('Triggering enhanced events to simulate real user input...');
        
        // First, trigger input event on the text span to simulate typing
        const replyTextSpan = outerDiv.querySelector('span[data-text="true"]');
        if (replyTextSpan) {
          replyTextSpan.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
          console.log('Triggered input event on text span');
        }
        
        // Trigger events on the editable content with more realistic simulation
        const events = [
          new Event('input', { bubbles: true, cancelable: true }),
          new Event('change', { bubbles: true, cancelable: true }),
          new Event('keyup', { bubbles: true, cancelable: true }),
          new Event('keydown', { bubbles: true, cancelable: true }),
          new Event('compositionend', { bubbles: true, cancelable: true }),
          new Event('paste', { bubbles: true, cancelable: true }),
          new Event('focus', { bubbles: true, cancelable: true }),
          new Event('blur', { bubbles: true, cancelable: true })
        ];
        
        events.forEach((event, index) => {
          setTimeout(() => {
            editableContent.dispatchEvent(event);
            console.log(`Triggered event ${index + 1}:`, event.type);
          }, index * 50); // Stagger events to simulate real user interaction
        });
        
        // Additional: Simulate typing by dispatching keydown/keyup events for each character
        setTimeout(() => {
          if (textSpan && textSpan.textContent) {
            const text = textSpan.textContent;
            console.log('Simulating character-by-character typing for:', text);
            
            for (let i = 0; i < text.length; i++) {
              setTimeout(() => {
                // Simulate keydown for each character
                const keydownEvent = new KeyboardEvent('keydown', {
                  key: text[i],
                  code: `Key${text[i].toUpperCase()}`,
                  bubbles: true,
                  cancelable: true
                });
                editableContent.dispatchEvent(keydownEvent);
                
                // Simulate keyup for each character
                const keyupEvent = new KeyboardEvent('keyup', {
                  key: text[i],
                  code: `Key${text[i].toUpperCase()}`,
                  bubbles: true,
                  cancelable: true
                });
                editableContent.dispatchEvent(keyupEvent);
              }, i * 10); // Small delay between characters
            }
          }
        }, 300);
        
        // Focus the editor and ensure it's active
        setTimeout(() => {
          editableContent.focus();
          console.log('Focused editable content');
          
          // Force a re-render by triggering additional events
          editableContent.dispatchEvent(new Event('focusin', { bubbles: true }));
          editableContent.dispatchEvent(new Event('focus', { bubbles: true }));
          
          // Additional: Try to trigger Twitter's internal content change detection
          const mutationEvent = new Event('DOMSubtreeModified', { bubbles: true });
          editableContent.dispatchEvent(mutationEvent);
          
          // Set cursor at the end of the reply text
          try {
            const range = document.createRange();
            const selection = window.getSelection();
            if (replyTextSpan && replyTextSpan.firstChild) {
              range.setStart(replyTextSpan.firstChild, replyTextSpan.firstChild.length);
              range.setEnd(replyTextSpan.firstChild, replyTextSpan.firstChild.length);
            } else {
              range.selectNodeContents(editableContent);
              range.collapse(false);
            }
            selection.removeAllRanges();
            selection.addRange(range);
            console.log('Cursor positioned at end of reply text');
          } catch (e) {
            console.log('Selection setting failed, but content should be set');
          }
          
        }, 100);
        
        // Enhanced placeholder hiding - try multiple selectors
        console.log('Attempting to hide placeholder text...');
        const placeholderSelectors = [
          '.public-DraftEditorPlaceholder-inner',
          '.public-DraftEditorPlaceholder-root',
          '[data-testid="placeholder"]',
          '.placeholder'
        ];
        
        let placeholderHidden = false;
        placeholderSelectors.forEach(selector => {
          const placeholder = editableContent.parentElement.querySelector(selector);
          if (placeholder) {
            placeholder.style.display = 'none';
            placeholder.style.visibility = 'hidden';
            placeholder.style.opacity = '0';
            placeholder.style.position = 'absolute';
            placeholder.style.pointerEvents = 'none';
            console.log(`Hidden placeholder with selector: ${selector}`);
            placeholderHidden = true;
          }
        });
        
        if (!placeholderHidden) {
          console.log('No placeholder found to hide');
        }
        
      } else {
        console.error('Could not find existing div with data-offset-key in:', editableContent);
        console.log('Available elements in editableContent:', editableContent.innerHTML);
        
        // Fallback: try to create a new structure from scratch
        console.log('Attempting fallback: creating new Twitter structure from scratch');
        
        // Try to find Twitter's actual editor ID even in fallback mode
        let actualEditorId = 'quirkly'; // fallback
        const existingOuterDiv = editableContent.querySelector('div[data-editor]');
        if (existingOuterDiv) {
          actualEditorId = existingOuterDiv.getAttribute('data-editor') || 'quirkly';
          console.log('Fallback: Found actual Twitter editor ID:', actualEditorId);
        } else {
          console.log('Fallback: No existing editor ID found, using fallback:', actualEditorId);
        }
        
        console.log('Fallback: Will use editor ID:', actualEditorId);
        
        // Create the COMPLETE Twitter structure from scratch:
        // 1. Outer div: data-block="true", data-editor (Twitter's actual ID), data-offset-key
        // 2. Middle div: data-offset-key + CSS classes
        // 3. Inner span: data-offset-key
        // 4. Text span: data-text="true"
        
        const fallbackOffsetKey = `quirkly-${Date.now()}-0`;
        
        const outerDiv = document.createElement('div');
        outerDiv.className = '';
        outerDiv.setAttribute('data-block', 'true');
        outerDiv.setAttribute('data-editor', actualEditorId); // Use Twitter's actual editor ID
        outerDiv.setAttribute('data-offset-key', fallbackOffsetKey);
        
        const middleDiv = document.createElement('div');
        middleDiv.setAttribute('data-offset-key', fallbackOffsetKey);
        middleDiv.className = 'public-DraftStyleDefault-block public-DraftStyleDefault-ltr';
        
        // Create the inner span with same offset key
        const innerSpan = document.createElement('span');
        innerSpan.setAttribute('data-offset-key', fallbackOffsetKey);
        
        // Create the innermost span with data-text="true" containing the reply
        const textSpan = document.createElement('span');
        textSpan.setAttribute('data-text', 'true');
        textSpan.textContent = replyText;
        
        // Assemble the complete structure: outerDiv > middleDiv > innerSpan > textSpan
        innerSpan.appendChild(textSpan);
        middleDiv.appendChild(innerSpan);
        outerDiv.appendChild(middleDiv);
        
        // Append to the editable content
        editableContent.appendChild(outerDiv);
        
        console.log('Fallback: Created and appended COMPLETE Twitter structure:', outerDiv.outerHTML);
        
        // Trigger events and focus
        const events = ['input', 'change', 'keyup', 'keydown', 'compositionend', 'paste'];
        events.forEach(eventType => {
          editableContent.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        
        editableContent.focus();
        
        // Hide placeholder
        const placeholder = editableContent.parentElement.querySelector('.public-DraftEditorPlaceholder-inner');
        if (placeholder) {
          placeholder.style.display = 'none';
        }
        
        return; // Success with fallback method
      }
    } catch (error) {
      console.error('Error in fillReplyBox:', error);
      throw error; // Re-throw to be caught by the calling function
    }
  }

  // BULLETPROOF METHOD: Inject reply using script tag to bypass all context issues
  injectReplyBulletproof(replyText) {
    try {
      console.log('Using bulletproof injection method...');
      
      // Store the reply in the page's window object (not extension context)
      const script = document.createElement('script');
      script.textContent = `
        // Store reply in page context
        window.quirklyReply = "${replyText.replace(/"/g, '\\"')}";
        window.quirklyReplyTimestamp = ${Date.now()};
        
        // Function to inject reply
        function injectQuirklyReply() {
          try {
            console.log('Quirkly: Injecting reply from page context...');
            
            const replyText = window.quirklyReply;
            const timestamp = window.quirklyReplyTimestamp;
            
            if (!replyText || !timestamp) {
              console.log('Quirkly: No reply found in page context');
              return;
            }
            
            // Check if reply is recent (within last 30 seconds)
            if (Date.now() - timestamp > 30000) {
              console.log('Quirkly: Reply too old, clearing');
              delete window.quirklyReply;
              delete window.quirklyReplyTimestamp;
              return;
            }
            
            console.log('Quirkly: Found reply:', replyText);
            
            // Try multiple injection methods
            let success = false;
            
            // Method 1: Look for any contenteditable element
            const contentEditable = document.querySelector('[contenteditable="true"]');
            if (contentEditable) {
              contentEditable.textContent = replyText;
              contentEditable.dispatchEvent(new Event('input', { bubbles: true }));
              contentEditable.focus();
              success = true;
              console.log('Quirkly: Injected into contenteditable element');
            }
            
            // Method 2: Look for Draft.js content
            if (!success) {
              const draftContent = document.querySelector('.public-DraftEditor-content');
              if (draftContent) {
                draftContent.textContent = replyText;
                draftContent.dispatchEvent(new Event('input', { bubbles: true }));
                draftContent.focus();
                success = true;
                console.log('Quirkly: Injected into Draft.js content');
              }
            }
            
            // Method 3: Look for any textarea
            if (!success) {
              const textarea = document.querySelector('textarea');
              if (textarea) {
                textarea.value = replyText;
                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                textarea.focus();
                success = true;
                console.log('Quirkly: Injected into textarea');
              }
            }
            
            // Method 4: Create floating text area if nothing else works
            if (!success) {
              const floatingTextArea = document.createElement('textarea');
              floatingTextArea.value = replyText;
              floatingTextArea.style.position = 'fixed';
              floatingTextArea.style.top = '50%';
              floatingTextArea.style.left = '50%';
              floatingTextArea.style.transform = 'translate(-50%, -50%)';
              floatingTextArea.style.zIndex = '10000';
              floatingTextArea.style.width = '500px';
              floatingTextArea.style.height = '200px';
              floatingTextArea.style.padding = '20px';
              floatingTextArea.style.border = '3px solid #1DA1F2';
              floatingTextArea.style.borderRadius = '12px';
              floatingTextArea.style.fontSize = '16px';
              floatingTextArea.style.background = 'white';
              floatingTextArea.style.color = 'black';
              floatingTextArea.style.boxShadow = '0 10px 30px rgba(0,0,0,0.3)';
              floatingTextArea.placeholder = 'Generated Reply (copy and paste into Twitter)';
              document.body.appendChild(floatingTextArea);
              floatingTextArea.focus();
              floatingTextArea.select();
              
              // Add close button
              const closeBtn = document.createElement('button');
              closeBtn.textContent = '×';
              closeBtn.style.position = 'absolute';
              closeBtn.style.top = '10px';
              closeBtn.style.right = '10px';
              closeBtn.style.background = '#1DA1F2';
              closeBtn.style.color = 'white';
              closeBtn.style.border = 'none';
              closeBtn.style.borderRadius = '50%';
              closeBtn.style.width = '30px';
              closeBtn.style.height = '30px';
              closeBtn.style.fontSize = '20px';
              closeBtn.style.cursor = 'pointer';
              closeBtn.onclick = () => floatingTextArea.remove();
              floatingTextArea.parentNode.appendChild(closeBtn);
              
              // Auto-remove after 30 seconds
              setTimeout(() => {
                if (floatingTextArea.parentNode) {
                  floatingTextArea.remove();
                }
              }, 30000);
              
              success = true;
              console.log('Quirkly: Created floating text area');
            }
            
            // Clear page context after successful injection
            if (success) {
              delete window.quirklyReply;
              delete window.quirklyReplyTimestamp;
              
              // Show success message
              const successDiv = document.createElement('div');
              successDiv.textContent = 'Reply generated successfully! ✨';
              successDiv.style.position = 'fixed';
              successDiv.style.top = '20px';
              successDiv.style.right = '20px';
              successDiv.style.background = '#16A34A';
              successDiv.style.color = 'white';
              successDiv.style.padding = '12px 20px';
              successDiv.style.borderRadius = '8px';
              successDiv.style.zIndex = '10001';
              successDiv.style.fontFamily = 'Arial, sans-serif';
              successDiv.style.fontSize = '14px';
              document.body.appendChild(successDiv);
              setTimeout(() => successDiv.remove(), 3000);
            }
            
          } catch (error) {
            console.error('Quirkly: Error in page context injection:', error);
          }
        }
        
        // Execute immediately
        injectQuirklyReply();
      `;
      
      // Inject the script into the page
      document.head.appendChild(script);
      
      // Remove the script tag after execution
      setTimeout(() => {
        if (script.parentNode) {
          script.remove();
        }
      }, 1000);
      
      console.log('Bulletproof injection script executed');
      
    } catch (error) {
      console.error('Error in bulletproof injection:', error);
      
      // Try the backup method
      this.injectReplyBackup(replyText);
    }
  }

  // BACKUP METHOD: Use data attributes and page-level event listeners
  injectReplyBackup(replyText) {
    try {
      console.log('Using backup injection method...');
      
      // Create a hidden div with the reply data
      const replyDiv = document.createElement('div');
      replyDiv.id = 'quirkly-reply-data';
      replyDiv.setAttribute('data-reply', replyText);
      replyDiv.setAttribute('data-timestamp', Date.now().toString());
      replyDiv.style.display = 'none';
      document.body.appendChild(replyDiv);
      
      // Create a script that will run in page context and watch for this data
      const script = document.createElement('script');
      script.textContent = `
        // Watch for reply data and inject it
        function watchForQuirklyReply() {
          const replyDiv = document.getElementById('quirkly-reply-data');
          if (replyDiv) {
            const replyText = replyDiv.getAttribute('data-reply');
            const timestamp = parseInt(replyDiv.getAttribute('data-timestamp'));
            
            if (replyText && timestamp && (Date.now() - timestamp < 30000)) {
              console.log('Quirkly: Found reply data, injecting...');
              
              // Try to inject into any available text area
              const textArea = document.querySelector('[contenteditable="true"], .public-DraftEditor-content, textarea');
              if (textArea) {
                if (textArea.contentEditable === 'true') {
                  textArea.textContent = replyText;
                } else if (textArea.value !== undefined) {
                  textArea.value = replyText;
                }
                textArea.dispatchEvent(new Event('input', { bubbles: true }));
                textArea.focus();
                
                // Remove the data div
                replyDiv.remove();
                
                // Show success message
                alert('Reply generated and inserted successfully! ✨');
                return;
              }
            }
          }
          
          // Check again in 100ms
          setTimeout(watchForQuirklyReply, 100);
        }
        
        // Start watching
        watchForQuirklyReply();
      `;
      
      // Inject the script
      document.head.appendChild(script);
      
      // Remove script after 5 seconds
      setTimeout(() => {
        if (script.parentNode) {
          script.remove();
        }
        if (replyDiv.parentNode) {
          replyDiv.remove();
        }
      }, 5000);
      
      console.log('Backup injection method executed');
      
    } catch (error) {
      console.error('Error in backup injection:', error);
      
      // Ultimate fallback: show in alert
      alert(`Generated Reply:\n\n${replyText}\n\nPlease copy and paste this into the reply box.`);
    }
  }

  // Use web worker to handle reply generation in separate context
  async generateReplyWithWorker(tone, replyBox) {
    try {
      console.log('Using web worker approach for reply generation...');
      
      // Create a simple web worker for reply generation
      const workerCode = `
        self.onmessage = function(e) {
          const { tweetText, tone, userContext } = e.data;
          
          // Simulate AI processing (in real implementation, this would call the API)
          setTimeout(() => {
            const reply = \`This is a \${tone} reply to: "\${tweetText}"\`;
            self.postMessage({ success: true, reply: reply });
          }, 1000);
        };
      `;
      
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      const worker = new Worker(URL.createObjectURL(blob));
      
      // Get original post content
      const originalPost = this.getOriginalPost();
      
      return new Promise((resolve, reject) => {
        worker.onmessage = (e) => {
          if (e.data.success) {
            resolve(e.data);
          } else {
            reject(new Error('Worker failed to generate reply'));
          }
          worker.terminate();
        };
        
        worker.onerror = (error) => {
          reject(new Error('Worker error: ' + error.message));
          worker.terminate();
        };
        
        // Send data to worker
        worker.postMessage({
          tweetText: originalPost,
          tone: tone,
          userContext: {
            userId: this.user?.id,
            email: this.user?.email,
            preferences: this.user?.preferences
          }
        });
      });
      
    } catch (error) {
      console.error('Web worker approach failed:', error);
      throw error;
    }
  }

  // Start monitoring for reply boxes with context validation
  startMonitoring() {
    console.log('Quirkly: Starting reply box monitoring...');
    
    // Only start DOM observer if we don't have buttons yet
    if (document.querySelectorAll('.quirkly-buttons').length === 0) {
      this.observeDOM();
    }
    
    // Start periodic search for reply boxes (but less frequently)
    this.periodicSearchInterval = setInterval(() => {
      // Check if extension context is still valid
      if (!this.isExtensionContextValid()) {
        console.log('Quirkly: Extension context lost during monitoring, stopping...');
        this.handleContextInvalidation();
        return;
      }
      
      // Only search if we don't have any buttons
      const existingButtons = document.querySelectorAll('.quirkly-buttons');
      if (existingButtons.length === 0) {
        console.log('Quirkly: No buttons found, searching for reply boxes...');
        this.searchForReplyBoxes();
      } else {
        console.log(`Quirkly: Found ${existingButtons.length} button containers, skipping search`);
      }
    }, 5000); // Check every 5 seconds
    
    console.log('Quirkly: Reply box monitoring started');
  }

  // Search for reply boxes and inject buttons
  searchForReplyBoxes() {
    try {
      if (!this.isExtensionContextValid()) {
        return;
      }

      // Skip if we already have buttons
      if (document.querySelectorAll('.quirkly-buttons').length > 0) {
        return;
      }

      console.log('Quirkly: Searching for reply boxes...');
      console.log('Quirkly: Current auth state - isAuthenticated:', this.isAuthenticated, 'isEnabled:', this.isEnabled);

      // Only look for the specific Twitter reply textarea
      const twitterTextarea = document.querySelector('[data-testid="tweetTextarea_0"]');
      
      if (twitterTextarea && !twitterTextarea.hasAttribute('data-quirkly-injected')) {
        // Check if buttons already exist in the parent container
        const parentContainer = twitterTextarea.parentElement;
        if (parentContainer && !parentContainer.querySelector('.quirkly-buttons')) {
          console.log('Quirkly: Found Twitter reply textarea, injecting buttons');
          this.injectButtons(twitterTextarea);
        } else {
          console.log('Quirkly: Buttons already exist in parent container');
        }
      } else {
        console.log('Quirkly: No Twitter reply textarea found or already injected');
      }
      
      console.log('Quirkly: Reply box search completed');
    } catch (error) {
      console.warn('Error searching for reply boxes:', error);
    }
  }

  getOriginalPost() {
    // Find the tweet text
    const tweetText = document.querySelector('[data-testid="tweetText"]');
    return tweetText ? tweetText.textContent.trim() : '';
  }

  showSuccess(message) {
    this.showNotification(message, 'success');
  }

  showError(message) {
    this.showNotification(message, 'error');
  }

  showNotification(message, type) {
    // Create notification
    const notification = document.createElement('div');
    notification.className = `quirkly-notification quirkly-notification-${type}`;
    notification.innerHTML = `
      <div class="quirkly-notification-content">
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
        <button class="quirkly-notification-close">&times;</button>
      </div>
    `;
    
    const baseStyles = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 12px;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      max-width: 350px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.15);
      animation: slideInRight 0.3s ease-out;
      border: 1px solid;
    `;
    
    const successStyles = `
      background: linear-gradient(135deg, #16A34A, #22C55E);
      color: white;
      border-color: #15803D;
    `;
    
    const errorStyles = `
      background: linear-gradient(135deg, #EF4444, #F87171);
      color: white;
      border-color: #DC2626;
    `;
    
    notification.style.cssText = baseStyles + (type === 'success' ? successStyles : errorStyles);
    
    const content = notification.querySelector('.quirkly-notification-content');
    content.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    const closeBtn = notification.querySelector('.quirkly-notification-close');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
      padding: 0;
      margin-left: auto;
      opacity: 0.8;
    `;
    
    closeBtn.addEventListener('click', () => {
      notification.remove();
    });
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 5000);
  }

  addTestButton() {
    // Don't add multiple test buttons
    if (document.querySelector('.quirkly-test-button')) {
      return;
    }

    const testButton = document.createElement('button');
    testButton.className = 'quirkly-test-button';
    testButton.textContent = 'Quirkly Test';
    testButton.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      background: linear-gradient(135deg, #6D5EF8, #22D3EE);
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      z-index: 10000;
      max-width: 200px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.2);
      animation: slideInLeft 0.3s ease-out;
      cursor: pointer;
      transition: transform 0.2s ease;
    `;

    testButton.addEventListener('click', () => {
      console.log('Quirkly Test Button Clicked');
      console.log('Quirkly Current State:', {
        isAuthenticated: this.isAuthenticated,
        isEnabled: this.isEnabled,
        hasApiKey: !!this.apiKey,
        hasUser: !!this.user,
        config: this.config
      });
      
      // Test storage access
      chrome.storage.sync.get(['apiKey', 'isEnabled', 'user'], (result) => {
        console.log('Quirkly Storage Test:', result);
        this.showSuccess(`Test: Auth=${this.isAuthenticated}, Enabled=${this.isEnabled}, API Key=${!!this.apiKey}`);
      });
    });

    document.body.appendChild(testButton);

    // Add CSS animation if not already added
    if (!document.querySelector('#quirkly-animations')) {
      const style = document.createElement('style');
      style.id = 'quirkly-animations';
      style.textContent = `
        @keyframes slideInLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Verify if the reply was successfully injected into the page
  verifyReplyInjection(replyText) {
    console.log('Quirkly: Verifying reply injection...');
    
    // Look for the reply text in the specific Twitter textarea
    const twitterTextarea = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (twitterTextarea) {
      const content = twitterTextarea.textContent || '';
      if (content.includes(replyText)) {
        console.log('Quirkly: Reply successfully injected into Twitter textarea:', twitterTextarea);
        this.showSuccess('Reply successfully injected into the reply box! ✨');
        return;
      }
    }
    
    // Fallback: look for the reply text in various possible locations
    const possibleLocations = [
      '[data-testid="tweetTextarea_0"]',
      '[data-testid="replyTextarea"]',
      '[data-testid="composeTextarea"]',
      '[contenteditable="true"]',
      '.public-DraftEditor-content'
    ];
    
    let found = false;
    let foundLocation = null;
    
    possibleLocations.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      elements.forEach(element => {
        const content = element.textContent || element.value || '';
        if (content.includes(replyText)) {
          found = true;
          foundLocation = element;
          console.log('Quirkly: Reply text found in:', selector, element);
        }
      });
    });
    
    if (found) {
      console.log('Quirkly: Reply successfully injected into:', foundLocation);
      this.showSuccess('Reply successfully injected into the reply box! ✨');
    } else {
      console.warn('Quirkly: Reply text not found in any reply box. Injection may have failed.');
      this.showError('Reply injection verification failed. Please check the reply box manually.');
      
      // Show the reply in a more prominent way
      this.showReplyFallback(replyText);
    }
  }

  // Show reply in a fallback way if injection verification fails
  showReplyFallback(replyText) {
    try {
      // Create a prominent notification with the reply
      const fallbackDiv = document.createElement('div');
      fallbackDiv.setAttribute('data-quirkly-extension', 'true');
      fallbackDiv.innerHTML = `
        <div style="background: #1DA1F2; color: white; padding: 20px; border-radius: 12px; margin: 20px; max-width: 500px;">
          <h3 style="margin: 0 0 15px 0;">Generated Reply</h3>
          <p style="margin: 0 0 15px 0; line-height: 1.5;">${replyText}</p>
          <button onclick="this.parentElement.parentElement.remove()" style="background: white; color: #1DA1F2; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Close</button>
        </div>
      `;
      
      fallbackDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10002;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.3);
      `;
      
      document.body.appendChild(fallbackDiv);
      
      // Auto-remove after 30 seconds
      setTimeout(() => {
        if (fallbackDiv.parentNode) {
          fallbackDiv.remove();
        }
      }, 30000);
      
    } catch (error) {
      console.error('Quirkly: Error showing fallback:', error);
      // Ultimate fallback: alert
      alert(`Generated Reply:\n\n${replyText}\n\nPlease copy and paste this into the reply box.`);
    }
  }

  // Helper to find the reply box containing the specific reply text
  findReplyBoxContainingText(replyText) {
    const replyBoxes = document.querySelectorAll('.quirkly-buttons'); // Assuming buttons are in a container
    for (const replyBox of replyBoxes) {
      const replyContent = replyBox.textContent.trim();
      if (replyContent.includes(replyText)) {
        return replyBox;
      }
    }
    return null;
  }

  // Stop all monitoring once we have buttons
  stopAllMonitoring() {
    try {
      console.log('Quirkly: Stopping all monitoring since buttons are now injected');
      
      // Stop DOM observer
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
        console.log('Quirkly: DOM observer stopped');
      }
      
      // Stop periodic search
      if (this.periodicSearchInterval) {
        clearInterval(this.periodicSearchInterval);
        this.periodicSearchInterval = null;
        console.log('Quirkly: Periodic search stopped');
      }
      
      // Stop periodic reply box search
      if (this.periodicSearchInterval) {
        clearInterval(this.periodicSearchInterval);
        this.periodicSearchInterval = null;
        console.log('Quirkly: Periodic reply box search stopped');
      }
      
    } catch (error) {
      console.error('Quirkly: Error stopping monitoring:', error);
    }
  }
}

// Global error handler for extension context errors
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('Extension context invalidated')) {
    console.log('Quirkly: Global error handler caught extension context invalidation');
    // Stop any running intervals or listeners
    return true; // Prevent default error handling
  }
});

// Safe initialization with context validation
function initializeQuirkly() {
  // Check if extension context is valid before initializing
  if (!chrome.runtime?.id) {
    console.log('Quirkly: Extension context not available, skipping initialization');
    return;
  }

  // Check if Quirkly is already initialized to prevent duplicates
  if (window.quirklyInitialized) {
    console.log('Quirkly: Already initialized, skipping duplicate initialization');
    return;
  }

  console.log('Quirkly: Content script loaded');
  
  try {
    if (document.readyState === 'loading') {
      console.log('Quirkly: DOM still loading, waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', () => {
        if (chrome.runtime?.id && !window.quirklyInitialized) {
          console.log('Quirkly: DOMContentLoaded fired, initializing');
          window.quirklyInitialized = true;
          new Quirkly();
        } else {
          console.log('Quirkly: Extension context invalidated before DOM ready or already initialized');
        }
      });
    } else {
      console.log('Quirkly: DOM already ready, initializing immediately');
      window.quirklyInitialized = true;
      new Quirkly();
    }
  } catch (error) {
    if (error.message?.includes('Extension context invalidated')) {
      console.log('Quirkly: Extension context invalidated during initialization');
    } else {
      console.error('Quirkly: Failed to initialize:', error);
    }
  }
}

// Initialize with a small delay to ensure Chrome APIs are ready
setTimeout(initializeQuirkly, 100);