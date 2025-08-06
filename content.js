// ReplyAI Content Script - Simple Working Version
class ReplyAI {
  constructor() {
    console.log('ReplyAI: Constructor called');
    this.n8nWebhookUrl = '';
    this.isEnabled = true;
    this.init();
  }

  async init() {
    console.log('ReplyAI: Init method called');
    await this.loadSettings();
    console.log('ReplyAI: Settings loaded, starting DOM observer');
    this.observeDOM();
    this.startSettingsWatcher();
    console.log('ReplyAI: Initialization complete');
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['n8nWebhookUrl', 'isEnabled']);
      this.n8nWebhookUrl = result.n8nWebhookUrl || '';
      this.isEnabled = result.isEnabled !== false;
      console.log('ReplyAI settings loaded:', { n8nWebhookUrl: this.n8nWebhookUrl, isEnabled: this.isEnabled });
    } catch (error) {
      console.error('Error loading ReplyAI settings:', error);
      this.isEnabled = false;
    }
  }

  // Periodically check for settings updates
  startSettingsWatcher() {
    setInterval(async () => {
      try {
        const result = await chrome.storage.sync.get(['n8nWebhookUrl', 'isEnabled']);
        const newWebhookUrl = result.n8nWebhookUrl || '';
        const newIsEnabled = result.isEnabled !== false;
        
        // Update if settings changed
        if (this.n8nWebhookUrl !== newWebhookUrl || this.isEnabled !== newIsEnabled) {
          this.n8nWebhookUrl = newWebhookUrl;
          this.isEnabled = newIsEnabled;
          console.log('ReplyAI settings updated:', { n8nWebhookUrl: this.n8nWebhookUrl, isEnabled: this.isEnabled });
        }
      } catch (error) {
        console.error('Error checking ReplyAI settings:', error);
      }
    }, 2000); // Check every 2 seconds
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
      if (replyBox && !replyBox.hasAttribute('data-replyai-injected')) {
        console.log('Found reply box with selector:', selector);
        this.injectButtons(replyBox);
        return;
      }
    }
    
    // Also check if the node itself is the reply box
    if (node.matches && selectors.some(selector => node.matches(selector))) {
      if (!node.hasAttribute('data-replyai-injected')) {
        console.log('Node itself is reply box');
        this.injectButtons(node);
      }
    }
  }

  injectButtons(replyBox) {
    console.log('ReplyAI: injectButtons called with replyBox:', replyBox);
    console.log('ReplyAI: isEnabled:', this.isEnabled, 'n8nWebhookUrl:', this.n8nWebhookUrl);
    
    if (!this.isEnabled || !this.n8nWebhookUrl) {
      console.log('ReplyAI: Skipping button injection - disabled or no webhook URL');
      return;
    }
    
    console.log('ReplyAI: Injecting buttons...');
    replyBox.setAttribute('data-replyai-injected', 'true');
    
    // Create simple button container
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'replyai-buttons';
    buttonContainer.innerHTML = `
      <button class="replyai-btn" data-tone="professional" type="button">Pro</button>
      <button class="replyai-btn" data-tone="casual" type="button">Casual</button>
      <button class="replyai-btn" data-tone="humorous" type="button">Fun</button>
      <button class="replyai-btn" data-tone="empathetic" type="button">Care</button>
      <button class="replyai-btn" data-tone="analytical" type="button">Smart</button>
      <button class="replyai-btn" data-tone="enthusiastic" type="button">Excited</button>
    `;

    // Insert buttons after the reply box
    replyBox.parentElement.appendChild(buttonContainer);

    // Add click handlers
    buttonContainer.querySelectorAll('.replyai-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        console.log('ReplyAI: Button clicked:', btn.dataset.tone);
        e.preventDefault();
        this.generateReply(btn.dataset.tone, replyBox, btn);
      });
    });
    
    console.log('ReplyAI: Buttons injected successfully');
  }

  async generateReply(tone, replyBox, clickedButton) {
    // Get all buttons for loading state management
    const allButtons = document.querySelectorAll('.replyai-btn');
    
    console.log('=== REPLYAI DEBUG START ===');
    console.log('Loading state - clicked button:', clickedButton);
    console.log('Loading state - all buttons:', allButtons.length);
    console.log('Tone:', tone);
    console.log('ReplyBox:', replyBox);
    
    try {
      // Show loading state
      this.setLoadingState(clickedButton, allButtons, true);
      
      // Get original post content
      const originalPost = this.getOriginalPost();
      
      console.log('Sending request to n8n:', this.n8nWebhookUrl);
      console.log('Request payload:', {
        tone: tone,
        originalPost: originalPost,
        timestamp: new Date().toISOString()
      });

      // Send request to n8n
      const response = await fetch(this.n8nWebhookUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        mode: 'cors',
        body: JSON.stringify({
          tone: tone,
          originalPost: originalPost,
          timestamp: new Date().toISOString()
        })
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      // Check if response is ok
      if (!response.ok) {
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
        throw new Error('Invalid JSON response from n8n');
      }
      
      console.log('Parsed response data:', data);
      
      // Handle the array response format with defensive programming
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
        
        // Find the actual editable content area within the reply box
        const editableContent = this.findEditableContent(replyBox);
        if (editableContent) {
          try {
            this.fillReplyBox(editableContent, replyData.reply);
          } catch (fillError) {
            console.error('Error filling reply box:', fillError);
            this.showError('Error inserting reply into text area');
          }
        } else {
          console.error('Could not find editable content in reply box');
        }
      } else {
        console.error('No valid reply received from n8n:', data);
        console.error('Reply data structure:', replyData);
        this.showError('No valid reply received from n8n. Check your workflow configuration.');
      }
    } catch (error) {
      console.error('Error generating reply:', error);
      
      // Provide more specific error information
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.error('CORS Error Details:');
        console.error('- URL:', this.n8nWebhookUrl);
        console.error('- This is likely a CORS issue. Check if your n8n instance allows requests from Chrome extensions.');
        console.error('- Make sure your n8n webhook has proper CORS headers configured.');
        
        // Show user-friendly error
        this.showError('Network Error: Unable to connect to n8n. Please check your webhook URL and CORS settings.');
      } else if (error.message.includes('types')) {
        console.error('Response Structure Error:');
        console.error('- The n8n response structure is not as expected.');
        console.error('- Expected format: { reply: "text" } or [{ reply: "text" }]');
        console.error('- Check your n8n workflow output format.');
        
        this.showError('Response Error: Invalid response format from n8n. Check your workflow configuration.');
      } else {
        this.showError(`Error: ${error.message}`);
      }
    } finally {
      // Reset loading state
      this.setLoadingState(clickedButton, allButtons, false);
      console.log('=== REPLYAI DEBUG END ===');
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
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
      });
      
      // Show loading state on clicked button
      if (clickedButton) {
        console.log('Setting loading state on clicked button:', clickedButton);
        clickedButton.classList.add('loading');
        clickedButton.innerHTML = '<span class="replyai-loader"></span> Generating...';
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
        
        // Reset button text to original
        const tone = btn.getAttribute('data-tone');
        const buttonLabels = {
          'professional': 'Pro',
          'casual': 'Casual', 
          'humorous': 'Fun',
          'empathetic': 'Care',
          'analytical': 'Smart',
          'enthusiastic': 'Excited'
        };
        btn.innerHTML = buttonLabels[tone] || tone;
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

  showError(message) {
    // Create error notification
    const errorDiv = document.createElement('div');
    errorDiv.className = 'replyai-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f4212e;
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }
}

// Initialize when DOM is ready
console.log('ReplyAI: Content script loaded');

if (document.readyState === 'loading') {
  console.log('ReplyAI: DOM still loading, waiting for DOMContentLoaded');
  document.addEventListener('DOMContentLoaded', () => {
    console.log('ReplyAI: DOMContentLoaded fired, initializing');
    new ReplyAI();
  });
} else {
  console.log('ReplyAI: DOM already ready, initializing immediately');
  new ReplyAI();
} 