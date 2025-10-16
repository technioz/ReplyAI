// Quirkly Content Script - Premium Authentication & AI Integration
// Version: 2.1.0 - Production URLs Enabled

class Quirkly {
  constructor() {
    this.apiKey = null;
    this.user = null;
    this.isEnabled = false;
    this.profileExtractor = null;
    this.extractedProfile = null;
    
    // Use dynamic config from QuirklyConfig
    this.config = QuirklyConfig.getConfig();
    
    this.observer = null;
    this.initialized = false;
    this.lastCheck = 0;
    this.checkInterval = 2000; // Check every 2 seconds
    this.periodicSearchInterval = null;
    
    
    // Initialize the extension
    this.init();
  }

  // Handle extension context invalidation gracefully
  handleContextInvalidationGracefully() {
    
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
      }
    }, 5000);
  }

  // Check if extension context is still valid
  isExtensionContextValid() {
    return !!(chrome.runtime && chrome.runtime.id);
  }

  // Simple, direct approach to handle context invalidation
  handleContextInvalidation() {
    
    // Use the graceful approach
    this.handleContextInvalidationGracefully();
  }

  async init() {
    try {
      // Check if extension context is still valid
      if (!this.isExtensionContextValid()) {
        this.handleContextInvalidation();
        return;
      }

      
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
      
      // Initialize profile extractor (includes manual extraction button)
      this.initializeProfileExtractor();
      
    } catch (error) {
      if (error.message?.includes('Extension context invalidated')) {
        this.handleContextInvalidation();
        return;
      }
    }
  }

  async loadSettings() {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        return;
      }

      const result = await chrome.storage.sync.get(['apiKey', 'isEnabled', 'user']);
      this.apiKey = result.apiKey || '';
      this.isEnabled = result.isEnabled !== false;
      this.user = result.user || null;
      this.isAuthenticated = !!(this.apiKey && this.user);
      
      chrome.runtime.sendMessage({
        hasApiKey: !!this.apiKey, 
        isEnabled: this.isEnabled, 
        hasUser: !!this.user,
        isAuthenticated: this.isAuthenticated
      });

      // Show authentication notice if not authenticated
      if (!this.isAuthenticated) {
        this.showAuthenticationNotice();
      } else {
        // Clean up any existing buttons first
        this.cleanupDuplicateButtons();
        this.cleanupOrphanedButtons(); // Clean up orphaned buttons
        // Force immediate search for reply boxes
        setTimeout(() => this.searchForReplyBoxes(), 1000);
      }
    } catch (error) {
      if (error.message?.includes('Extension context invalidated')) {
        return;
      }
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
          clearInterval(intervalId);
          this.handleContextInvalidationGracefully();
          return;
        }

        // Additional context health check
        if (!this.isExtensionContextValid()) {
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
          this.isAuthenticated = newIsAuthenticated;
          this.apiKey = newApiKey;
          this.user = newUser;
          this.isEnabled = newIsEnabled;
          
          if (newIsAuthenticated) {
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
          chrome.runtime.sendMessage({
            hasApiKey: !!this.apiKey, 
            isEnabled: this.isEnabled, 
            hasUser: !!this.user
          });
          
          // If newly authenticated, start button injection
          if (this.isAuthenticated && this.isEnabled) {
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
          clearInterval(intervalId);
          return;
        }
      }
    }, 2000); // Check every 2 seconds
  }

  removeAllButtons() {
    const existingButtons = document.querySelectorAll('.quirkly-buttons');
    existingButtons.forEach(buttonContainer => {
      buttonContainer.remove();
    });
    
    // Remove injected flags
    const injectedElements = document.querySelectorAll('[data-quirkly-injected]');
    injectedElements.forEach(element => {
      element.removeAttribute('data-quirkly-injected');
    });
    
    // Remove container flags
    const containerFlags = document.querySelectorAll('[data-quirkly-container]');
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
      
      
      // Keep only the first button container in each parent
      const processedParents = new Set();
      
      allButtons.forEach((buttonContainer, index) => {
        const parent = buttonContainer.parentElement;
        if (processedParents.has(parent)) {
          buttonContainer.remove();
        } else {
          processedParents.add(parent);
        }
      });
      
    } catch (error) {
    }
  }

  // Clean up any orphaned or misplaced button containers
  cleanupOrphanedButtons() {
    try {
      const allButtons = document.querySelectorAll('.quirkly-buttons');
      
      allButtons.forEach((buttonContainer, index) => {
        const parent = buttonContainer.parentElement;
        if (parent) {
          // Check if this parent contains a valid reply box
          const hasReplyBox = parent.querySelector('[data-testid="tweetTextarea_0"], [data-testid="replyTextarea"], [data-testid="composeTextarea"]');
          if (!hasReplyBox) {
            buttonContainer.remove();
          }
        }
      });
      
    } catch (error) {
    }
  }

  // Reset initialization flag when extension is reloaded
  resetInitializationFlag() {
    if (window.quirklyInitialized) {
      window.quirklyInitialized = false;
    }
  }

  // Clean up any conflicts with Twitter's code
  cleanupConflicts() {
    try {
      // Remove any elements that might conflict with Twitter's functionality
      const conflictingElements = document.querySelectorAll('[data-quirkly-extension]');
      if (conflictingElements.length > 0) {
        conflictingElements.forEach(element => {
          try {
            element.remove();
          } catch (error) {
          }
        });
      }
    } catch (error) {
    }
  }

  observeDOM() {
    try {
      const observer = new MutationObserver((mutations) => {
        let shouldSearch = false;
        
        mutations.forEach((mutation) => {
          // Process added nodes
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                // Skip if this is our own extension elements
                if (node.hasAttribute && (node.hasAttribute('data-quirkly-extension') || node.hasAttribute('data-quirkly-container'))) {
                  return;
                }
                
                // Check if this looks like a modal or reply box
                if (this.isModalOrReplyBox(node)) {
                  shouldSearch = true;
                }
                
                // Check if any child elements look like reply boxes
                const replyBoxes = node.querySelectorAll ? node.querySelectorAll('[data-testid*="tweetTextarea"], div[contenteditable="true"], textarea') : [];
                if (replyBoxes.length > 0) {
                  shouldSearch = true;
                }
              }
            });
          }
          
          // Process attribute changes (for modal visibility)
          if (mutation.type === 'attributes') {
            const target = mutation.target;
            if (target.hasAttribute('role') && target.getAttribute('role') === 'dialog') {
              shouldSearch = true;
            }
            
            // Check for modal visibility changes
            if (mutation.attributeName === 'style' || mutation.attributeName === 'class') {
              if (this.isModalOrReplyBox(target)) {
                shouldSearch = true;
              }
            }
          }
        });
        
        // Trigger search if needed
        if (shouldSearch) {
          setTimeout(() => {
            this.searchForReplyBoxes();
          }, 100); // Small delay to let DOM settle
        }
      });
      
      // Start observing with more comprehensive options
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['role', 'style', 'class', 'data-testid']
      });
      
      this.observer = observer;
    } catch (error) {
    }
  }

  // Check if element looks like a modal or reply box
  isModalOrReplyBox(element) {
    // Check for modal indicators
    if (element.hasAttribute('role') && element.getAttribute('role') === 'dialog') {
      return true;
    }
    
    // Check for modal-related classes
    const classList = element.classList;
    if (classList.contains('modal') || 
        classList.contains('overlay') || 
        classList.contains('backdrop') ||
        classList.contains('popup') ||
        classList.contains('dialog')) {
      return true;
    }

    // Check for modal-specific data attributes
    if (element.hasAttribute('data-testid')) {
      const testId = element.getAttribute('data-testid');
      if (testId.includes('modal') || 
          testId.includes('dialog') || 
          testId.includes('overlay') ||
          testId.includes('popup') ||
          testId.includes('compose') ||
          testId.includes('tweetTextarea')) {
        return true;
      }
    }

    // Check for reply box indicators
    if (element.hasAttribute('data-testid') && 
        element.getAttribute('data-testid').includes('tweetTextarea')) {
      return true;
    }

    if (element.hasAttribute('contenteditable') && 
        element.getAttribute('contenteditable') === 'true') {
      return true;
    }

    return false;
  }

  startPeriodicReplyBoxSearch() {
    // Clear any existing interval
    if (this.periodicSearchInterval) {
      clearInterval(this.periodicSearchInterval);
    }
    
    // Don't start periodic search if we already have buttons
    if (document.querySelectorAll('.quirkly-buttons').length > 0) {
      return;
    }
    
    this.periodicSearchInterval = setInterval(() => {
      if (this.isAuthenticated && this.isEnabled) {
        // Only search if we haven't found any reply boxes yet
        const existingButtons = document.querySelectorAll('.quirkly-buttons');
        if (existingButtons.length === 0) {
          this.searchForMissedReplyBoxes();
        } else {
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
    
    
    // Only look for the specific Twitter reply textarea
    const twitterTextarea = node.querySelector ? node.querySelector('[data-testid="tweetTextarea_0"]') : null;
    
    if (twitterTextarea && !twitterTextarea.hasAttribute('data-quirkly-injected')) {
      // Check if buttons already exist in the parent container
      const parentContainer = twitterTextarea.parentElement;
      if (parentContainer && !parentContainer.querySelector('.quirkly-buttons')) {
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
          this.injectButtons(node);
        }
      }
    }
  }

  injectButtons(replyBox) {
    if (!this.isAuthenticated || !this.isEnabled || !this.apiKey) {
      return;
    }
    
    // Check if buttons already exist for this reply box
    if (replyBox.hasAttribute('data-quirkly-injected')) {
      return;
    }
    
    // Check if buttons already exist in the parent container
    const existingButtons = replyBox.parentElement?.querySelector('.quirkly-buttons');
    if (existingButtons) {
      return;
    }
    
    // Final check: make sure we don't have buttons anywhere
    if (document.querySelectorAll('.quirkly-buttons').length > 0) {
      return;
    }
    
    replyBox.setAttribute('data-quirkly-injected', 'true');

    // Create premium button container with minimal interference
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'quirkly-buttons';
    buttonContainer.setAttribute('data-quirkly-container', 'true');
    buttonContainer.setAttribute('data-quirkly-extension', 'true');
    
    // Let CSS handle the styling, minimal inline styles
    buttonContainer.style.cssText = `
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 8px;
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
      <button class="quirkly-btn" data-tone="controversial" type="button" data-quirkly-btn="true">
        <span class="btn-icon">⚡</span> Controversial
      </button>
    `;

    // Add CSS styles for buttons to ensure proper alignment
    if (!document.querySelector('#quirkly-button-styles')) {
      const style = document.createElement('style');
      style.id = 'quirkly-button-styles';
      style.textContent = `
        .quirkly-btn {
          display: inline-flex !important;
          align-items: center !important;
          gap: 6px !important;
          padding: 8px 12px !important;
          margin: 0 !important;
          border: 1px solid rgba(29, 155, 240, 0.3) !important;
          border-radius: 20px !important;
          background: rgba(29, 155, 240, 0.1) !important;
          color: rgb(29, 155, 240) !important;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
          font-size: 13px !important;
          font-weight: 500 !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          white-space: nowrap !important;
          flex-shrink: 0 !important;
          position: relative !important;
          z-index: 1001 !important;
        }
        
        .quirkly-btn:hover {
          background: rgba(29, 155, 240, 0.2) !important;
          border-color: rgba(29, 155, 240, 0.5) !important;
          transform: translateY(-1px) !important;
        }
        
        .quirkly-btn:active {
          transform: translateY(0) !important;
          background: rgba(29, 155, 240, 0.3) !important;
        }
        
        .quirkly-btn:disabled {
          opacity: 0.6 !important;
          cursor: not-allowed !important;
          transform: none !important;
        }
        
        .quirkly-btn .btn-icon {
          font-size: 14px !important;
          line-height: 1 !important;
        }
        
        .quirkly-buttons {
          display: flex !important;
          flex-wrap: wrap !important;
          gap: 8px !important;
          align-items: center !important;
          justify-content: flex-start !important;
          width: auto !important;
          margin: 0 !important;
          padding: 0 !important; /* Remove padding to align with native buttons */
          position: relative !important;
          z-index: 1000 !important;
          /* Remove border-top to integrate seamlessly */
        }
      `;
      document.head.appendChild(style);
    }

    // Insert buttons into X's toolbar container
    try {
      
      // Target the action button container that holds the native X buttons
      const toolbarSelectors = [
        // 1. Primary: Look for the container with native X action buttons
        '[data-testid="toolbar"]',
        '[data-testid="composeToolbar"]', 
        '[data-testid="tweetComposeToolbar"]',
        // 2. Alternative: Look for containers with native action buttons
        '[data-testid="addPhotosOrVideo"]', // Will get parent container
        '[data-testid="addGif"]', // Will get parent container
        // 3. Fallback: Legacy selectors
        'nav[aria-live="polite"][aria-relevant="additions text"]',
        'nav[aria-live="polite"][role="toolbar"]',
        'nav[role="toolbar"]',
        '[role="toolbar"]'
      ];
      
      let toolbar = null;
      let usedSelector = null;
      
      for (const selector of toolbarSelectors) {
        if (selector === '[data-testid="addPhotosOrVideo"]' || selector === '[data-testid="addGif"]') {
          // Special case: get parent container of native action buttons
          const actionButton = document.querySelector(selector);
          if (actionButton) {
            // Find the parent container that holds the action buttons
            let container = actionButton.parentElement;
            while (container && container !== document.body) {
              // Check if this container has multiple action buttons (likely the toolbar)
              const actionButtons = container.querySelectorAll('[data-testid="addPhotosOrVideo"], [data-testid="addGif"], [data-testid="grokButton"]');
              if (actionButtons.length >= 2) {
                toolbar = container;
                usedSelector = selector + ' (parent container)';
                break;
              }
              container = container.parentElement;
            }
            if (toolbar) break;
          }
        } else {
          toolbar = document.querySelector(selector);
          if (toolbar) {
            usedSelector = selector;
            break;
          }
        }
      }
      
      // If still no toolbar, look for action button containers by searching for typical X buttons
      // But only within the context of the current reply box
      if (!toolbar) {
        // Look for containers that have typical X action buttons within the reply box context
        const replyContainer = replyBox.closest('[role="dialog"]') || replyBox.closest('div[data-testid*="compose"]') || replyBox.closest('div[data-testid*="reply"]') || document;
        const searchContext = replyContainer === document ? document : replyContainer;
        
        const actionButtonSelectors = [
          '[data-testid="addPhotosOrVideo"]',
          '[data-testid="addGif"]', 
          '[data-testid="grokButton"]',
          '[aria-label*="Add photos or video"]',
          '[aria-label*="GIF"]',
          '[aria-label*="Grok"]'
        ];
        
        for (const buttonSelector of actionButtonSelectors) {
          const actionButton = searchContext.querySelector(buttonSelector);
          if (actionButton) {
            // Find the parent container that holds action buttons
            let container = actionButton.parentElement;
            while (container && container !== document.body) {
              // Check if this container has multiple action buttons (likely the toolbar)
              const actionButtons = container.querySelectorAll(actionButtonSelectors.join(', '));
              if (actionButtons.length >= 2) {
                // Additional check: make sure this container is related to the current reply box
                const isRelatedToReplyBox = container.contains(replyBox) || 
                                          container.closest('[role="dialog"]') === replyBox.closest('[role="dialog"]') ||
                                          container === replyBox.parentElement?.parentElement;
                
                if (isRelatedToReplyBox) {
                  toolbar = container;
                  usedSelector = `action-button-container (found via ${buttonSelector})`;
                  break;
                }
              }
              container = container.parentElement;
            }
            if (toolbar) break;
          }
        }
        
        // If still no toolbar, try the disabled Reply button approach
        if (!toolbar) {
          const disabledReplyButton = document.querySelector('[role="button"]:disabled, button:disabled');
          if (disabledReplyButton) {
            // Look for adjacent group/div container
            const adjacentContainer = disabledReplyButton.previousElementSibling || 
                                    disabledReplyButton.parentElement?.previousElementSibling;
            
            if (adjacentContainer) {
              toolbar = adjacentContainer;
              usedSelector = 'disabled-reply-button-adjacent';
            }
          }
        }
        
        // If still no toolbar, check dialog container
        if (!toolbar) {
          const dialog = replyBox.closest('[role="dialog"]');
          if (dialog) {
            for (const selector of toolbarSelectors) {
              if (selector === 'textarea[aria-current="true"][aria-autocomplete="list"]') {
                const textarea = dialog.querySelector(selector);
                if (textarea && textarea.parentNode) {
                  toolbar = textarea.parentNode;
                  usedSelector = selector + ' (within dialog, parent)';
                  break;
                }
              } else {
                toolbar = dialog.querySelector(selector);
                if (toolbar) {
                  usedSelector = selector + ' (within dialog)';
                  break;
                }
              }
            }
          }
        }
      }
      
      if (toolbar) {
        // Insert buttons directly into the toolbar
        toolbar.appendChild(buttonContainer);
      } else {
        
        // Create a custom toolbar-like container
        const customToolbar = document.createElement('div');
        customToolbar.setAttribute('role', 'toolbar');
        customToolbar.setAttribute('aria-label', 'Quirkly tone buttons');
        customToolbar.style.cssText = `
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-top: 1px solid rgba(83, 100, 113, 0.3);
          background: transparent;
        `;
        
        // Insert the custom toolbar after the reply box
      const parent = replyBox.parentElement;
      if (parent) {
          // Look for existing action buttons to insert before them
          const actionButtons = parent.querySelector('[data-testid*="toolbar"]') ||
                               parent.querySelector('[role="group"]') ||
                               parent.querySelector('[data-testid*="action"]');
          
          if (actionButtons) {
            parent.insertBefore(customToolbar, actionButtons);
          } else {
            // Insert after reply box
        if (replyBox.nextSibling) {
              parent.insertBefore(customToolbar, replyBox.nextSibling);
        } else {
              parent.appendChild(customToolbar);
            }
          }
          
          // Add buttons to the custom toolbar
          customToolbar.appendChild(buttonContainer);
        } else {
          return;
        }
      }
    } catch (error) {
      return;
    }

    // Add click handlers with better event handling
    buttonContainer.querySelectorAll('.quirkly-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Prevent Twitter's handlers from running
        
        // Check extension context before proceeding
        if (!this.isExtensionContextValid()) {
          this.showError('Extension connection lost. Please refresh the page and try again.');
          return;
        }
        
        // Use a small delay to let Twitter's code settle
        setTimeout(() => {
          this.generateReply(btn.dataset.tone, replyBox);
        }, 100);
      });
    });
    
    // Stop all monitoring once we have buttons
    this.stopAllMonitoring();
  }


  async generateReply(tone, replyBox) {
    // Check if extension context is still valid before proceeding
    if (!this.isExtensionContextValid()) {
      this.showError('Extension context lost. Please refresh the page and try again.');
      return;
    }

    
    try {
      // Simple loading state - just disable the button
      const button = document.querySelector(`[data-tone="${tone}"]`);
      if (button) {
        button.disabled = true;
        button.innerHTML = '<span class="btn-icon">⏳</span> Generating...';
      }
      
      // Get original post content
      const originalPost = this.getOriginalPost();
      
      
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
            userId: this.user?.id || this.user?._id,
            email: this.user?.email,
            preferences: this.user?.preferences,
            credits: this.user?.credits
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

      
      // Check extension context before processing reply data
      if (!this.isExtensionContextValid()) {
        throw new Error('Extension context invalidated before processing reply data');
      }
      
      // Handle the response
      let replyData = response.data;
      
      if (replyData && typeof replyData === 'object' && replyData.reply) {
        
        // Use the simplified method: inject directly into the Twitter reply box
        try {
          const success = this.fillReplyBox(null, replyData.reply);
          if (success) {
            this.showSuccess('Reply generated and inserted successfully! ✨');
            
            // Additional verification: check if the reply actually appeared
            setTimeout(() => {
              this.verifyReplyInjection(replyData.reply);
            }, 1000);
          } else {
            this.showError('Could not find Twitter reply textarea');
          }
        } catch (fillError) {
          this.showError('Error inserting reply into text area');
        }
        
      } else {
        throw new Error('No valid reply received');
      }
      
    } catch (error) {
      
      // Handle extension context errors specifically
      if (error.message?.includes('Extension context invalidated')) {
        this.showError('Extension context lost. Please refresh the page and try again.');
      } else {
        this.showError(`Failed to generate reply: ${error.message}`);
      }
    } finally {
      // Re-enable button and restore original content
      const button = document.querySelector(`[data-tone="${tone}"]`);
      if (button) {
        button.disabled = false;
        // Restore original button content with emoji
        const emojiMap = {
          professional: '💼',
          casual: '😊', 
          humorous: '😄',
          empathetic: '❤️',
          analytical: '🧠',
          enthusiastic: '🔥',
          controversial: '⚡'
        };
        const emoji = emojiMap[tone] || '';
        button.innerHTML = `<span class="btn-icon">${emoji}</span> ${tone.charAt(0).toUpperCase() + tone.slice(1)}`;
      }
    }
  }



  // Fill the reply box with the generated reply text using simple, effective injection
  fillReplyBox(editableContent, replyText) {
    try {
      
      if (!replyText || typeof replyText !== 'string') {
        throw new Error('Invalid reply text');
      }
      
      // Simple and effective approach: locate the Twitter reply textarea and inject text
      const textarea = document.querySelector('div[role="textbox"][data-testid="tweetTextarea_0"]');
      
      if (textarea) {
        
        // Focus the textarea first
        textarea.focus();
        
        // Use execCommand to insert text (works for contentEditable elements)
        document.execCommand('insertText', false, replyText);
        
        // Dispatch input event so Twitter registers the change
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Additional events to ensure Twitter recognizes the input
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
        textarea.dispatchEvent(new Event('keyup', { bubbles: true }));
        
        
        // Hide placeholder text if present
        const placeholder = textarea.parentElement?.querySelector('.public-DraftEditorPlaceholder-inner');
        if (placeholder) {
          placeholder.style.display = 'none';
        }
        
        return true;
      } else {
        return false;
      }
      
    } catch (error) {
      throw error;
    }
  }





  // Start monitoring for reply boxes with context validation
  startMonitoring() {
    
    // Always start DOM observer for modal detection
    this.observeDOM();
    
    // Add event listeners for modal-specific events
    this.addModalEventListeners();
    
    // Start periodic search for reply boxes (more frequent for modals)
    this.periodicSearchInterval = setInterval(() => {
      // Check if extension context is still valid
      if (!this.isExtensionContextValid()) {
        this.handleContextInvalidation();
        return;
      }
      
      // Always search for reply boxes (both inline and modal)
      this.searchForReplyBoxes();
    }, 2000); // Check every 2 seconds for faster modal detection
    
  }

  // Add event listeners for modal-specific events
  addModalEventListeners() {
    // Listen for clicks that might open modals
    document.addEventListener('click', (event) => {
      const target = event.target;
      
      // Check if this click might open a reply modal
      if (target.closest('[data-testid="reply"]') || 
          target.closest('[aria-label*="Reply"]') ||
          target.closest('button[aria-label*="Reply"]')) {
        setTimeout(() => {
          this.searchForReplyBoxes();
        }, 500);
      }
    }, true); // Use capture phase for better detection

    // Listen for keyboard events that might open modals
    document.addEventListener('keydown', (event) => {
      // Check for common modal opening shortcuts
      if (event.key === 'Enter' && event.ctrlKey) {
        setTimeout(() => {
          this.searchForReplyBoxes();
        }, 200);
      }
    });

    // Listen for focus events on potential reply boxes
    document.addEventListener('focusin', (event) => {
      const target = event.target;
      if (target.hasAttribute('data-testid') && 
          target.getAttribute('data-testid').includes('tweetTextarea')) {
        setTimeout(() => {
          this.searchForReplyBoxes();
        }, 100);
      }
    }, true);
  }

  // Search for reply boxes and inject buttons
  searchForReplyBoxes() {
    try {
      if (!this.isExtensionContextValid()) {
        return;
      }


      // First, clean up buttons from inactive reply boxes
      this.cleanupInactiveButtons();

      // Find all potential reply textareas
      const replyTextareas = document.querySelectorAll('[data-testid="tweetTextarea_0"]');

      let activeTextareaFound = false;

      for (const textarea of replyTextareas) {
        // Skip if already injected
        if (textarea.hasAttribute('data-quirkly-injected')) {
          continue;
        }

        // Check if this textarea is currently focused/active
        const isActive = document.activeElement === textarea || 
                        textarea.matches(':focus') ||
                        textarea.closest('[role="dialog"]') !== null; // Modal replies are active

        // Only inject into active/focused textareas or modal textareas
        if (isActive) {
        // Check if buttons already exist in the parent container
          const parentContainer = textarea.parentElement;
        if (parentContainer && !parentContainer.querySelector('.quirkly-buttons')) {
            this.injectButtons(textarea);
            activeTextareaFound = true;
            break; // Only inject into one active textarea at a time
        } else {
            activeTextareaFound = true;
          }
        }
      }

      // If no active textarea found, inject into the first available one (fallback)
      if (!activeTextareaFound) {
        const firstAvailableTextarea = Array.from(replyTextareas).find(textarea => 
          !textarea.hasAttribute('data-quirkly-injected') && 
          !textarea.closest('.quirkly-buttons')
        );
        
        if (firstAvailableTextarea) {
          this.injectButtons(firstAvailableTextarea);
        }
      }
      
    } catch (error) {
    }
  }

  // Clean up buttons from inactive reply boxes
  cleanupInactiveButtons() {
    try {
      const allQuirklyButtons = document.querySelectorAll('.quirkly-buttons');

      for (const buttonContainer of allQuirklyButtons) {
        // Find the associated textarea
        const associatedTextarea = buttonContainer.closest('div')?.querySelector('[data-testid="tweetTextarea_0"]');
        
        if (associatedTextarea) {
          const isActive = document.activeElement === associatedTextarea || 
                          associatedTextarea.matches(':focus') ||
                          associatedTextarea.closest('[role="dialog"]') !== null;

          if (!isActive) {
            buttonContainer.remove();
            associatedTextarea.removeAttribute('data-quirkly-injected');
          }
        }
      }
    } catch (error) {
    }
  }

  // Find reply textarea in popup modal
  findModalReplyTextarea() {
    // Look for textarea in modal with specific attributes
    const modalSelectors = [
      '[data-testid="tweetTextarea_0"]', // Standard textarea
      'div[role="textbox"][data-testid="tweetTextarea_0"]', // Modal textarea
      'div[contenteditable="true"][data-testid="tweetTextarea_0"]', // Contenteditable version
      'div[role="textbox"][contenteditable="true"]', // Generic modal textbox
      'div[data-testid="tweetTextarea_0"][contenteditable="true"]' // Modal contenteditable
    ];

    for (const selector of modalSelectors) {
      const textarea = document.querySelector(selector);
      if (textarea && this.isInModal(textarea)) {
        return textarea;
      }
    }

    // Fallback: look for any textarea/div with contenteditable in a modal
    const allTextareas = document.querySelectorAll('div[contenteditable="true"], textarea');
    for (const textarea of allTextareas) {
      if (this.isInModal(textarea) && this.looksLikeReplyBox(textarea)) {
        return textarea;
      }
    }

    return null;
  }

  // Check if element is inside a modal
  isInModal(element) {
    // Look for modal indicators in the DOM hierarchy
    let current = element;
    while (current && current !== document.body) {
      // Check for modal-specific attributes and classes
      if (current.hasAttribute('role') && current.getAttribute('role') === 'dialog') {
        return true;
      }
      
      // Check for modal-related classes
      const classList = current.classList;
      if (classList.contains('modal') || 
          classList.contains('overlay') || 
          classList.contains('backdrop') ||
          classList.contains('popup') ||
          classList.contains('dialog')) {
        return true;
      }

      // Check for modal-specific data attributes
      if (current.hasAttribute('data-testid')) {
        const testId = current.getAttribute('data-testid');
        if (testId.includes('modal') || 
            testId.includes('dialog') || 
            testId.includes('overlay') ||
            testId.includes('popup')) {
          return true;
        }
      }

      current = current.parentElement;
    }

    return false;
  }

  // Check if element looks like a reply box
  looksLikeReplyBox(element) {
    // Check for reply-specific attributes
    if (element.hasAttribute('data-testid') && 
        element.getAttribute('data-testid').includes('tweetTextarea')) {
      return true;
    }

    // Check for placeholder text that suggests it's a reply box
    const placeholder = element.getAttribute('placeholder') || 
                      element.getAttribute('aria-label') || 
                      element.textContent;
    
    if (placeholder && (
        placeholder.toLowerCase().includes('reply') ||
        placeholder.toLowerCase().includes('tweet') ||
        placeholder.toLowerCase().includes('post'))) {
      return true;
    }

    // Check if it's in a context that suggests it's a reply
    const parent = element.parentElement;
    if (parent && parent.textContent.toLowerCase().includes('replying to')) {
      return true;
    }

    return false;
  }

  // Find the modal container for button injection
  findModalContainer(textarea) {
    // Look for the action bar or button container in the modal
    let current = textarea;
    while (current && current !== document.body) {
      // Look for action bar or button container
      if (current.querySelector('[role="button"], button, .action-bar, .toolbar')) {
        return current;
      }
      
      // Look for specific modal containers
      if (current.hasAttribute('data-testid')) {
        const testId = current.getAttribute('data-testid');
        if (testId.includes('toolbar') || 
            testId.includes('action') || 
            testId.includes('compose')) {
          return current;
        }
      }

      current = current.parentElement;
    }

    // Fallback: return the textarea's immediate parent
    return textarea.parentElement;
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
      chrome.runtime.sendMessage({
        isAuthenticated: this.isAuthenticated,
        isEnabled: this.isEnabled,
        hasApiKey: !!this.apiKey,
        hasUser: !!this.user,
        config: this.config
      });
      
      // Test storage access
      chrome.storage.sync.get(['apiKey', 'isEnabled', 'user'], (result) => {
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
    
    // Look for the reply text in the Twitter textarea
    const twitterTextarea = document.querySelector('div[role="textbox"][data-testid="tweetTextarea_0"]');
    if (twitterTextarea) {
      const content = twitterTextarea.textContent || '';
      if (content.includes(replyText)) {
        return true;
      }
    }
    
    return false;
  }





  // Stop all monitoring once we have buttons
  stopAllMonitoring() {
    try {
      
      // Stop DOM observer
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      
      // Stop periodic search
      if (this.periodicSearchInterval) {
        clearInterval(this.periodicSearchInterval);
        this.periodicSearchInterval = null;
      }
      
      // Stop periodic reply box search
      if (this.periodicSearchInterval) {
        clearInterval(this.periodicSearchInterval);
        this.periodicSearchInterval = null;
      }
      
    } catch (error) {
    }
  }

  // Profile Extraction Methods
  initializeProfileExtractor() {
    try {
      if (window.XProfileExtractor) {
        this.profileExtractor = new window.XProfileExtractor();
        
        // Extract profile data if we're on a profile page
        this.extractProfileDataIfNeeded();
        
        // Add manual extraction button for debugging
        this.addManualExtractionButton();
      } else {
      }
    } catch (error) {
    }
  }

  addManualExtractionButton() {
    // Only add button on profile pages
    if (!this.profileExtractor?.isProfilePage()) {
      return;
    }

    // Check if button already exists
    if (document.querySelector('#quirkly-extract-profile-btn')) {
      return;
    }

    const button = document.createElement('button');
    button.id = 'quirkly-extract-profile-btn';
    button.textContent = '🔄 Extract Profile';
    button.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 20px;
      z-index: 999999;
      padding: 12px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    `;

    button.onmouseover = () => {
      button.style.transform = 'translateY(-2px)';
      button.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
    };

    button.onmouseout = () => {
      button.style.transform = 'translateY(0)';
      button.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    };

    button.onclick = async () => {
      button.textContent = '⏳ Extracting...';
      button.disabled = true;
      
      try {
        const profileData = await this.profileExtractor.extractProfileData();
        
        if (profileData) {
          await this.sendProfileDataToBackend(profileData);
          button.textContent = '✅ Extracted!';
          button.style.background = 'linear-gradient(135deg, #56ab2f 0%, #a8e063 100%)';
          
          setTimeout(() => {
            button.textContent = '🔄 Extract Profile';
            button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            button.disabled = false;
          }, 3000);
        } else {
          throw new Error('Extraction returned null');
        }
      } catch (error) {
        button.textContent = '❌ Failed';
        button.style.background = 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)';
        
        setTimeout(() => {
          button.textContent = '🔄 Extract Profile';
          button.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
          button.disabled = false;
        }, 3000);
      }
    };

    document.body.appendChild(button);
  }

  async extractProfileDataIfNeeded() {
    try {
      if (!this.profileExtractor) {
        return;
      }

      // Enhanced profile page detection
      const url = window.location.href;
      const pathname = window.location.pathname;
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
        
        // Wait for critical elements to load
        await this.waitForProfileElements();
        
        // Extract profile data
        const profileData = await this.profileExtractor.extractProfileData();
        if (profileData) {
          this.extractedProfile = profileData;
          
          // Send profile data to background script for storage
          await this.sendProfileDataToBackend(profileData);
        } else {
        }
      }
    } catch (error) {
    }
  }

  // Wait for critical profile elements to load
  async waitForProfileElements() {
    return new Promise((resolve) => {
      const maxWaitTime = 10000; // 10 seconds
      const checkInterval = 500; // 500ms
      let elapsedTime = 0;
      
      const checkElements = () => {
        const criticalSelectors = [
          '[data-testid="UserName"]',
          '[data-testid="UserProfileHeader_Items"]',
          'h1[data-testid="UserName"]',
          'a[href*="/followers"]',
          'a[href*="/following"]'
        ];
        
        const foundElements = criticalSelectors.filter(selector => 
          document.querySelector(selector) !== null
        );
        
        
        if (foundElements.length >= 2 || elapsedTime >= maxWaitTime) {
          resolve(foundElements.length >= 2);
        } else {
          elapsedTime += checkInterval;
          setTimeout(checkElements, checkInterval);
        }
      };
      
      checkElements();
    });
  }

  async sendProfileDataToBackend(profileData) {
    try {
      if (!this.apiKey || !this.user) {
        return;
      }

      
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'storeProfileData',
          profileData: profileData,
          userId: this.user.id || this.user._id
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response);
          }
        });
      });

      if (response && response.success) {
      } else {
      }
    } catch (error) {
    }
  }

  getExtractedProfile() {
    return this.extractedProfile;
  }

  // Enhanced reply generation with profile context
  async generateReplyWithProfileContext(tone, replyBox) {
    try {
      
      // Get the original post content
      const originalPost = this.extractOriginalPost(replyBox);
      if (!originalPost) {
        throw new Error('Could not extract original post content');
      }

      // Get profile context if available
      const profileContext = this.extractedProfile ? {
        userProfile: {
          handle: this.extractedProfile.xHandle,
          displayName: this.extractedProfile.displayName,
          bio: this.extractedProfile.bio,
          expertise: this.extractExpertiseFromProfile(this.extractedProfile),
          tone: this.extractToneFromProfile(this.extractedProfile)
        }
      } : {};


      // Send message to background script with profile context
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'generateReply',
          tweetText: originalPost,
          tone: tone,
          userContext: {
            userId: this.user?.id || this.user?._id,
            email: this.user?.email,
            preferences: this.user?.preferences,
            credits: this.user?.credits,
            ...profileContext
          }
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Unknown error from background script'));
          }
        });
      });

      
      // Handle the response
      let replyData = response.data;
      
      if (replyData && typeof replyData === 'object' && replyData.reply) {
        this.insertReply(replyData.reply, replyBox);
      } else {
        throw new Error('Invalid response format from background script');
      }

    } catch (error) {
      this.showError('Failed to generate reply: ' + error.message);
    }
  }

  extractExpertiseFromProfile(profile) {
    try {
      const expertise = {
        domains: [],
        keywords: [],
        topics: []
      };

      // Extract from bio
      if (profile.bio) {
        const bioText = profile.bio.toLowerCase();
        
        // Common expertise keywords
        const expertiseKeywords = [
          'developer', 'engineer', 'designer', 'marketer', 'entrepreneur', 'founder', 'ceo', 'cto',
          'data scientist', 'analyst', 'consultant', 'advisor', 'expert', 'specialist',
          'tech', 'ai', 'machine learning', 'blockchain', 'crypto', 'fintech', 'healthtech',
          'marketing', 'sales', 'product', 'growth', 'startup', 'venture', 'investor'
        ];

        expertiseKeywords.forEach(keyword => {
          if (bioText.includes(keyword)) {
            expertise.keywords.push(keyword);
          }
        });
      }

      // Extract from recent tweets
      if (profile.recentTweets && profile.recentTweets.length > 0) {
        const tweetTexts = profile.recentTweets.map(tweet => tweet.content.toLowerCase()).join(' ');
        
        // Extract hashtags as topics
        const hashtags = tweetTexts.match(/#\w+/g);
        if (hashtags) {
          expertise.topics = [...new Set(hashtags.map(tag => tag.substring(1)))];
        }
      }

      return expertise;
    } catch (error) {
      return { domains: [], keywords: [], topics: [] };
    }
  }

  extractToneFromProfile(profile) {
    try {
      const tone = {
        primaryTone: 'professional',
        secondaryTones: [],
        characteristics: []
      };

      // Analyze bio tone
      if (profile.bio) {
        const bioText = profile.bio.toLowerCase();
        
        if (bioText.includes('fun') || bioText.includes('humor') || bioText.includes('joke')) {
          tone.characteristics.push('humorous');
        }
        if (bioText.includes('passionate') || bioText.includes('love')) {
          tone.characteristics.push('passionate');
        }
        if (bioText.includes('thoughtful') || bioText.includes('deep')) {
          tone.characteristics.push('thoughtful');
        }
      }

      // Analyze recent tweets
      if (profile.recentTweets && profile.recentTweets.length > 0) {
        const avgLength = profile.recentTweets.reduce((sum, tweet) => sum + tweet.content.length, 0) / profile.recentTweets.length;
        
        if (avgLength < 50) {
          tone.characteristics.push('concise');
        } else if (avgLength > 200) {
          tone.characteristics.push('detailed');
        }
      }

      return tone;
    } catch (error) {
      return { primaryTone: 'professional', secondaryTones: [], characteristics: [] };
    }
  }
}

// Global error handler for extension context errors
window.addEventListener('error', (event) => {
  if (event.error?.message?.includes('Extension context invalidated')) {
    // Stop any running intervals or listeners
    return true; // Prevent default error handling
  }
});

// Safe initialization with context validation
function initializeQuirkly() {
  // Check if extension context is valid before initializing
  if (!chrome.runtime?.id) {
    return;
  }

  // Check if Quirkly is already initialized to prevent duplicates
  if (window.quirklyInitialized) {
    return;
  }

  
  try {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        if (chrome.runtime?.id && !window.quirklyInitialized) {
          window.quirklyInitialized = true;
          new Quirkly();
        } else {
        }
      });
    } else {
      window.quirklyInitialized = true;
      new Quirkly();
    }
  } catch (error) {
    if (error.message?.includes('Extension context invalidated')) {
    } else {
    }
  }
}

// Initialize with a small delay to ensure Chrome APIs are ready
setTimeout(initializeQuirkly, 100);
setTimeout(initializeQuirkly, 100);