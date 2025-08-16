// Quirkly Content Script - Premium Authentication & n8n Integration
class Quirkly {
  constructor() {
    console.log('Quirkly: Constructor called');
    this.apiKey = '';
    this.isEnabled = true;
    this.isAuthenticated = false;
    this.user = null;
    
    // Get URLs from config based on environment
    const config = QuirklyConfig.getConfig();
    this.n8nWebhookUrl = config.replyUrl;
    this.dashboardUrl = config.dashboardUrl + '/dashboard';
    
    console.log('Quirkly: Environment config loaded:', {
      environment: config.environment,
      replyUrl: config.replyUrl,
      dashboardUrl: this.dashboardUrl
    });
    
    this.init();
  }

  async init() {
    console.log('Quirkly: Init method called');
    
    // Check if extension context is valid before proceeding
    if (!chrome.runtime?.id) {
      console.log('Quirkly: Extension context invalidated, aborting initialization');
      return;
    }

    await this.loadSettings();
    
    // Check again after async operation
    if (!chrome.runtime?.id) {
      console.log('Quirkly: Extension context invalidated during settings load');
      return;
    }
    
    if (this.isAuthenticated) {
      console.log('Quirkly: User authenticated, starting DOM observer');
      this.observeDOM();
      this.startSettingsWatcher();
    } else {
      console.log('Quirkly: User not authenticated, extension disabled');
      this.showAuthenticationNotice();
    }
    
    console.log('Quirkly: Initialization complete');
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
          
          if (!newIsAuthenticated) {
            // Remove existing buttons if user signed out
            this.removeAllButtons();
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
        }
      } catch (error) {
        if (error.message?.includes('Extension context invalidated')) {
          console.log('Quirkly: Extension context invalidated, clearing interval');
          clearInterval(intervalId);
          return;
        }
        console.error('Error checking Quirkly settings:', error);
      }
    }, 3000); // Check every 3 seconds
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
  }

  observeDOM() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            this.checkForReplyBox(node);
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  checkForReplyBox(node) {
    // Only proceed if authenticated and enabled
    if (!this.isAuthenticated || !this.isEnabled) {
      return;
    }
    
    console.log('Checking node for reply box:', node);
    
    // Look for the reply compose area with multiple selectors
    const selectors = [
      '[data-testid="tweetTextarea_0"]',
      '[data-testid="tweetTextarea"]',
      '.public-DraftEditor-root',
      '[contenteditable="true"]'
    ];
    
    for (const selector of selectors) {
      const replyBox = node.querySelector ? node.querySelector(selector) : null;
      if (replyBox && !replyBox.hasAttribute('data-quirkly-injected')) {
        console.log('Found reply box with selector:', selector);
        this.injectButtons(replyBox);
        return;
      }
    }
    
    // Also check if the node itself is the reply box
    if (node.matches && selectors.some(selector => node.matches(selector))) {
      if (!node.hasAttribute('data-quirkly-injected')) {
        console.log('Node itself is reply box');
        this.injectButtons(node);
      }
    }
  }

  injectButtons(replyBox) {
    console.log('Quirkly: injectButtons called with replyBox:', replyBox);
    console.log('Quirkly: isAuthenticated:', this.isAuthenticated, 'isEnabled:', this.isEnabled, 'hasApiKey:', !!this.apiKey);
    
    if (!this.isAuthenticated || !this.isEnabled || !this.apiKey) {
      console.log('Quirkly: Skipping button injection - not authenticated or disabled');
      return;
    }
    
    console.log('Quirkly: Injecting buttons...');
    replyBox.setAttribute('data-quirkly-injected', 'true');

    // Create premium button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'quirkly-buttons';
    buttonContainer.innerHTML = `
      <button class="quirkly-btn" data-tone="professional" type="button">
        <span class="btn-icon">💼</span> Professional
      </button>
      <button class="quirkly-btn" data-tone="casual" type="button">
        <span class="btn-icon">😊</span> Casual
      </button>
      <button class="quirkly-btn" data-tone="humorous" type="button">
        <span class="btn-icon">😄</span> Humorous
      </button>
      <button class="quirkly-btn" data-tone="empathetic" type="button">
        <span class="btn-icon">❤️</span> Empathetic
      </button>
      <button class="quirkly-btn" data-tone="analytical" type="button">
        <span class="btn-icon">🧠</span> Analytical
      </button>
      <button class="quirkly-btn" data-tone="enthusiastic" type="button">
        <span class="btn-icon">🔥</span> Enthusiastic
      </button>
    `;

    // Insert buttons after the reply box
    replyBox.parentElement.appendChild(buttonContainer);

    // Add click handlers
    buttonContainer.querySelectorAll('.quirkly-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        console.log('Quirkly: Button clicked:', btn.dataset.tone);
        e.preventDefault();
        e.stopPropagation();
        this.generateReply(btn.dataset.tone, replyBox, btn);
      });
    });
    
    console.log('Quirkly: Buttons injected successfully');
  }

  async generateReply(tone, replyBox, clickedButton) {
    // Get all buttons for loading state management
    const allButtons = document.querySelectorAll('.quirkly-btn');
    
    console.log('=== QUIRKLY DEBUG START ===');
    console.log('Loading state - clicked button:', clickedButton);
    console.log('Loading state - all buttons:', allButtons.length);
    console.log('Tone:', tone);
    console.log('ReplyBox:', replyBox);
    console.log('API Key available:', !!this.apiKey);
    console.log('User data:', this.user);
    
    try {
      // Show loading state
      this.setLoadingState(clickedButton, allButtons, true);
      
      // Get original post content
      const originalPost = this.getOriginalPost();
      
      console.log('Sending request to n8n:', this.n8nWebhookUrl);
      console.log('Request payload:', {
        tone: tone,
        originalPost: originalPost,
        apiKey: this.apiKey ? 'present' : 'missing',
        userId: this.user?.id,
        timestamp: new Date().toISOString()
      });

      // Send request to n8n with API key authentication
      const response = await fetch(this.n8nWebhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'X-User-ID': this.user?.id || '',
          'X-Extension-Version': '1.0.0'
        },
        mode: 'cors',
        body: JSON.stringify({
          tone: tone,
          originalPost: originalPost,
          apiKey: this.apiKey,
          user: this.user,
          timestamp: new Date().toISOString(),
          source: 'chrome-extension'
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      // Check if response is ok
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please check your API key.');
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else if (response.status === 403) {
          throw new Error('Access denied. Please check your subscription.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Get response text first for debugging
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON response:', parseError);
        console.error('Response text:', responseText);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('Parsed response data:', data);
      
      // Handle the response format
      let replyData;
      try {
        replyData = Array.isArray(data) ? data[0] : data;
        console.log('Processed reply data:', replyData);
      } catch (dataError) {
        console.error('Error processing response data:', dataError);
        throw new Error('Invalid response data structure');
      }
      
      if (replyData && typeof replyData === 'object' && replyData.reply) {
        console.log('Received reply:', replyData.reply);
        
        // Update user stats if provided
        if (replyData.user && replyData.user.apiCallsUsed !== undefined) {
          this.user.apiCallsUsed = replyData.user.apiCallsUsed;
          await chrome.storage.sync.set({ user: this.user });
        }
        
        // Find the actual editable content area within the reply box
        const editableContent = this.findEditableContent(replyBox);
        if (editableContent) {
          try {
            this.fillReplyBox(editableContent, replyData.reply);
            this.showSuccess('Reply generated successfully! ✨');
          } catch (fillError) {
            console.error('Error filling reply box:', fillError);
            this.showError('Error inserting reply into text area');
          }
        } else {
          console.error('Could not find editable content in reply box');
          this.showError('Could not find text area to insert reply');
        }
      } else {
        console.error('No valid reply received from server:', data);
        console.error('Reply data structure:', replyData);
        this.showError('No valid reply received. Please try again.');
      }
    } catch (error) {
      console.error('Error generating reply:', error);
      
      // Provide more specific error information
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error('Network Error Details:');
        console.error('- URL:', this.n8nWebhookUrl);
        console.error('- This is likely a network connectivity issue.');
        
        this.showError('Network error: Unable to connect to server. Please check your internet connection.');
      } else if (error.message.includes('Authentication')) {
        this.showError('Authentication error: Please check your API key in the extension settings.');
      } else if (error.message.includes('Rate limit')) {
        this.showError('Rate limit exceeded: Please wait before generating another reply.');
      } else if (error.message.includes('Access denied')) {
        this.showError('Access denied: Please check your subscription status.');
      } else {
        this.showError(`Error: ${error.message}`);
      }
    } finally {
      // Reset loading state
      this.setLoadingState(clickedButton, allButtons, false);
      console.log('=== QUIRKLY DEBUG END ===');
    }
  }

  setLoadingState(clickedButton, allButtons, isLoading) {
    console.log('setLoadingState called:', { isLoading, clickedButton: !!clickedButton, allButtonsCount: allButtons.length });
    
    if (isLoading) {
      console.log('Setting loading state...');
      // Disable all buttons
      allButtons.forEach((btn, index) => {
        console.log(`Disabling button ${index}:`, btn);
        btn.disabled = true;
        btn.style.opacity = '0.6';
        btn.style.cursor = 'not-allowed';
        btn.style.pointerEvents = 'none';
      });
      
      // Show loading state on clicked button
      if (clickedButton) {
        console.log('Setting loading state on clicked button:', clickedButton);
        clickedButton.classList.add('loading');
        const originalContent = clickedButton.innerHTML;
        clickedButton.dataset.originalContent = originalContent;
        clickedButton.innerHTML = '<span class="quirkly-loader"></span> Generating...';
      } else {
        console.error('No clicked button found for loading state');
      }
    } else {
      console.log('Resetting loading state...');
      // Re-enable all buttons
      allButtons.forEach((btn, index) => {
        console.log(`Re-enabling button ${index}:`, btn);
        btn.disabled = false;
        btn.classList.remove('loading');
        btn.style.opacity = '';
        btn.style.cursor = '';
        btn.style.pointerEvents = '';
        
        // Reset button content if it was the clicked button
        if (btn.dataset.originalContent) {
          btn.innerHTML = btn.dataset.originalContent;
          delete btn.dataset.originalContent;
        }
      });
    }
  }

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
      
      // Find the existing span with data-offset-key
      const existingSpan = editableContent.querySelector('span[data-offset-key]');
    
      if (existingSpan) {
        console.log('Found existing span:', existingSpan);
        
        // Get the existing offset key
        const offsetKey = existingSpan.getAttribute('data-offset-key');
        console.log('Using existing offset key:', offsetKey);
        
        // Escape the text to prevent HTML injection
        const escapedText = replyText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        
        // Replace the content of the existing span
        existingSpan.innerHTML = `<span data-text="true">${escapedText}</span>`;
        
        console.log('Content set successfully');
        
        // Trigger multiple events to make X recognize the content
        const events = ['input', 'change', 'keyup', 'keydown', 'compositionend', 'paste'];
        events.forEach(eventType => {
          editableContent.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        
        // Focus the editor
        editableContent.focus();
        
        // Set cursor at the end
        try {
          const range = document.createRange();
          const selection = window.getSelection();
          const textNode = existingSpan.querySelector('span[data-text="true"]');
          if (textNode && textNode.firstChild) {
            range.setStart(textNode.firstChild, textNode.firstChild.length);
            range.setEnd(textNode.firstChild, textNode.firstChild.length);
          } else {
            range.selectNodeContents(editableContent);
            range.collapse(false);
          }
          selection.removeAllRanges();
          selection.addRange(range);
        } catch (e) {
          // Fallback if selection fails
          console.log('Selection setting failed, but content should be set');
        }
        
        // Hide the placeholder
        const placeholder = editableContent.parentElement.querySelector('.public-DraftEditorPlaceholder-inner');
        if (placeholder) {
          placeholder.style.display = 'none';
        }
        
      } else {
        console.error('Could not find existing span with data-offset-key in:', editableContent);
        console.log('Available elements in editableContent:', editableContent.innerHTML);
        throw new Error('Could not find editable content span');
      }
    } catch (error) {
      console.error('Error in fillReplyBox:', error);
      throw error; // Re-throw to be caught by the calling function
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

  console.log('Quirkly: Content script loaded');
  
  try {
    if (document.readyState === 'loading') {
      console.log('Quirkly: DOM still loading, waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', () => {
        if (chrome.runtime?.id) {
          console.log('Quirkly: DOMContentLoaded fired, initializing');
          new Quirkly();
        } else {
          console.log('Quirkly: Extension context invalidated before DOM ready');
        }
      });
    } else {
      console.log('Quirkly: DOM already ready, initializing immediately');
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