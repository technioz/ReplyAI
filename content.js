// ReplyAI Content Script
class ReplyAI {
  constructor() {
    this.n8nWebhookUrl = ''; // Will be set from popup
    this.isEnabled = true;
    this.toneButtons = null;
    this.currentTextarea = null;
    this.init();
  }

  async init() {
    // Load settings from storage
    await this.loadSettings();
    
    // Start observing DOM changes
    this.observeDOM();
    
    // Initial injection
    this.injectToneButtons();
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['n8nWebhookUrl', 'isEnabled']);
      this.n8nWebhookUrl = result.n8nWebhookUrl || '';
      this.isEnabled = result.isEnabled !== false;
    } catch (error) {
      console.error('Error loading XBot settings:', error);
    }
  }

  observeDOM() {
    const observer = new MutationObserver((mutations) => {
      if (!this.isEnabled) return;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              this.checkForReplyInterface(node);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  checkForReplyInterface(node) {
    // Check if this is a reply textarea
    const textareas = node.querySelectorAll ? node.querySelectorAll('[data-testid="tweetTextarea_0"]') : [];
    textareas.forEach(textarea => {
      if (!textarea.hasAttribute('data-replyai-injected')) {
        this.injectToneButtonsForTextarea(textarea);
      }
    });

    // Also check if the node itself is a textarea
    if (node.matches && node.matches('[data-testid="tweetTextarea_0"]')) {
      if (!node.hasAttribute('data-replyai-injected')) {
        this.injectToneButtonsForTextarea(textarea);
      }
    }
  }

  injectToneButtons() {
    const textareas = document.querySelectorAll('[data-testid="tweetTextarea_0"]');
    textareas.forEach(textarea => {
      if (!textarea.hasAttribute('data-replyai-injected')) {
        this.injectToneButtonsForTextarea(textarea);
      }
    });
  }

  injectToneButtonsForTextarea(textarea) {
    if (!this.isEnabled || !this.n8nWebhookUrl) return;

    textarea.setAttribute('data-replyai-injected', 'true');
    this.currentTextarea = textarea;

    // Create tone buttons container
    const toneContainer = document.createElement('div');
    toneContainer.className = 'replyai-tone-container';
    toneContainer.innerHTML = `
      <div class="replyai-tone-buttons">
        <button class="replyai-tone-btn" data-tone="professional">Professional</button>
        <button class="replyai-tone-btn" data-tone="casual">Casual</button>
        <button class="replyai-tone-btn" data-tone="humorous">Humorous</button>
        <button class="replyai-tone-btn" data-tone="empathetic">Empathetic</button>
        <button class="replyai-tone-btn" data-tone="analytical">Analytical</button>
        <button class="replyai-tone-btn" data-tone="enthusiastic">Enthusiastic</button>
      </div>
      <div class="replyai-loading" style="display: none;">
        <span>Generating reply...</span>
      </div>
    `;

    // Insert after the textarea
    const parent = textarea.closest('[data-testid="tweetTextarea_0"]') || textarea.parentElement;
    parent.appendChild(toneContainer);

    // Add event listeners
    const buttons = toneContainer.querySelectorAll('.replyai-tone-btn');
    buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.generateReply(button.dataset.tone, textarea);
      });
    });

    this.toneButtons = toneContainer;
  }

  async generateReply(tone, textarea) {
    if (!this.n8nWebhookUrl) {
      alert('Please configure your n8n webhook URL in the extension settings.');
      return;
    }

    // Show loading state
    const loadingDiv = this.toneButtons.querySelector('.replyai-loading');
    const buttonsDiv = this.toneButtons.querySelector('.replyai-tone-buttons');
    loadingDiv.style.display = 'block';
    buttonsDiv.style.display = 'none';

    try {
      // Get the original post content
      const originalPost = this.getOriginalPostContent();
      
      // Prepare the request payload
      const payload = {
        tone: tone,
        originalPost: originalPost,
        userContext: this.getUserContext(),
        timestamp: new Date().toISOString(),
        extensionVersion: '1.0.0'
      };

      // Send request to n8n webhook
      const response = await fetch(this.n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.reply) {
        // Fill the textarea with the generated reply
        textarea.value = data.reply;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        
        // Trigger any X-specific events
        textarea.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        throw new Error('No reply received from n8n workflow');
      }

    } catch (error) {
      console.error('Error generating reply:', error);
      alert(`Error generating reply: ${error.message}`);
    } finally {
      // Hide loading state
      loadingDiv.style.display = 'none';
      buttonsDiv.style.display = 'flex';
    }
  }

  getOriginalPostContent() {
    // Find the original post content
    const postSelectors = [
      '[data-testid="tweetText"]',
      '[data-testid="tweet"] [lang]',
      '.tweet-text'
    ];

    for (const selector of postSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const element of elements) {
        // Find the closest tweet container
        const tweetContainer = element.closest('[data-testid="tweet"]');
        if (tweetContainer && tweetContainer.textContent.trim()) {
          return element.textContent.trim();
        }
      }
    }

    return '';
  }

  getUserContext() {
    // Get user profile information if available
    const userInfo = {
      username: '',
      displayName: '',
      followers: '',
      following: ''
    };

    try {
      // Try to get user info from various selectors
      const usernameElement = document.querySelector('[data-testid="UserName"] span');
      if (usernameElement) {
        userInfo.displayName = usernameElement.textContent.trim();
      }

      // Get more context about the current page
      userInfo.currentUrl = window.location.href;
      userInfo.pageTitle = document.title;
    } catch (error) {
      console.error('Error getting user context:', error);
    }

    return userInfo;
  }
}

// Initialize ReplyAI when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ReplyAI();
  });
} else {
  new ReplyAI();
}

// Listen for settings updates from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'settingsUpdated') {
    // Reload settings and re-initialize if needed
    window.location.reload();
  }
}); 