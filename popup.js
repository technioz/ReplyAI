// Quirkly Popup Script - Premium Authentication Flow
class QuirklyPopup {
  constructor() {
    console.log('Quirkly Popup: Constructor called');
    this.apiKey = '';
    this.isAuthenticated = false;
    this.user = null;
    
    // Get URLs from config based on environment
    const config = QuirklyConfig.getConfig();
    this.authUrl = config.authUrl;
    this.dashboardUrl = config.dashboardUrl;
    
    console.log('Quirkly Popup: Environment config loaded:', {
      environment: config.environment,
      authUrl: this.authUrl,
      dashboardUrl: this.dashboardUrl
    });
    
    this.init();
  }

  async init() {
    console.log('Quirkly Popup: Init method called');
    await this.loadSettings();
    this.bindEvents();
    this.updateUI();
    console.log('Quirkly Popup: Initialization complete');
  }

  async loadSettings() {
    try {
      // Check if extension context is still valid
      if (!chrome.runtime?.id) {
        console.log('Quirkly Popup: Extension context invalidated, stopping initialization');
        return;
      }

      const result = await chrome.storage.sync.get(['apiKey', 'isEnabled', 'user']);
      this.apiKey = result.apiKey || '';
      this.isEnabled = result.isEnabled !== false;
      this.user = result.user || null;
      this.isAuthenticated = !!(this.apiKey && this.user);
      
      console.log('Quirkly Popup settings loaded:', { 
        hasApiKey: !!this.apiKey, 
        isEnabled: this.isEnabled, 
        hasUser: !!this.user,
        isAuthenticated: this.isAuthenticated
      });
    } catch (error) {
      if (error.message?.includes('Extension context invalidated')) {
        console.log('Quirkly Popup: Extension context invalidated, stopping execution');
        return;
      }
      console.error('Error loading Quirkly Popup settings:', error);
      this.isAuthenticated = false;
    }
  }

  bindEvents() {
    // Authentication events
    const apiKeyInput = document.getElementById('apiKey');
    const toggleApiKeyBtn = document.getElementById('toggleApiKey');
    const authenticateBtn = document.getElementById('authenticateBtn');
    const dashboardLink = document.getElementById('dashboardLink');
    const signOutBtn = document.getElementById('signOutBtn');
    const enableToggle = document.getElementById('enableToggle');

    if (apiKeyInput) {
      apiKeyInput.addEventListener('input', this.handleApiKeyInput.bind(this));
      apiKeyInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.authenticate();
        }
      });
    }

    if (toggleApiKeyBtn) {
      toggleApiKeyBtn.addEventListener('click', this.toggleApiKeyVisibility.bind(this));
    }

    if (authenticateBtn) {
      authenticateBtn.addEventListener('click', this.authenticate.bind(this));
    }

    if (dashboardLink) {
      dashboardLink.addEventListener('click', this.openDashboard.bind(this));
    }

    if (signOutBtn) {
      signOutBtn.addEventListener('click', this.signOut.bind(this));
    }

    if (enableToggle) {
      enableToggle.addEventListener('click', this.toggleExtension.bind(this));
    }

    // Tone selection events
    const toneItems = document.querySelectorAll('.tone-item');
    toneItems.forEach(item => {
      item.addEventListener('click', () => {
        this.showToneInfo(item.dataset.tone);
      });
    });
  }

  updateUI() {
    const authSection = document.getElementById('authSection');
    const settingsSection = document.getElementById('settingsSection');
    const apiKeyInput = document.getElementById('apiKey');
    const enableToggle = document.getElementById('enableToggle');

    if (this.isAuthenticated && this.user) {
      // Show settings section
      if (authSection) authSection.style.display = 'none';
      if (settingsSection) {
        settingsSection.style.display = 'flex';
        settingsSection.classList.add('fade-in');
      }
      
      this.updateUserInfo();
      this.updateStats();
      
      // Set toggle state
      if (enableToggle) {
        if (this.isEnabled) {
        enableToggle.classList.add('active');
        } else {
          enableToggle.classList.remove('active');
        }
      }
    } else {
      // Show authentication section
      if (settingsSection) settingsSection.style.display = 'none';
      if (authSection) {
        authSection.style.display = 'flex';
        authSection.classList.add('fade-in');
      }
      
      // Pre-fill API key if available
      if (apiKeyInput && this.apiKey) {
        apiKeyInput.value = this.apiKey;
      }
    }
  }

  updateUserInfo() {
    const userInitials = document.getElementById('userInitials');
    const userEmail = document.getElementById('userEmail');

    if (this.user && userInitials && userEmail) {
      const initials = this.user.fullName 
        ? this.user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()
        : this.user.email.charAt(0).toUpperCase();
      
      userInitials.textContent = initials;
      userEmail.textContent = this.user.fullName || this.user.email;
    }
  }

  updateStats() {
    const apiCallsUsed = document.getElementById('apiCallsUsed');
    const apiCallsLimit = document.getElementById('apiCallsLimit');

    if (this.user && apiCallsUsed && apiCallsLimit) {
      apiCallsUsed.textContent = this.user.apiCallsUsed || 0;
      apiCallsLimit.textContent = this.user.apiCallsLimit || 100;
    }
  }

  handleApiKeyInput(e) {
    const value = e.target.value.trim();
    const authenticateBtn = document.getElementById('authenticateBtn');
    
    if (authenticateBtn) {
      authenticateBtn.disabled = !value;
      if (value) {
        authenticateBtn.classList.remove('btn-disabled');
      } else {
        authenticateBtn.classList.add('btn-disabled');
      }
    }
  }

  toggleApiKeyVisibility() {
    const apiKeyInput = document.getElementById('apiKey');
    const toggleBtn = document.getElementById('toggleApiKey');
    const icon = toggleBtn.querySelector('i');

    if (apiKeyInput.type === 'password') {
      apiKeyInput.type = 'text';
      icon.classList.remove('fa-eye');
      icon.classList.add('fa-eye-slash');
    } else {
      apiKeyInput.type = 'password';
      icon.classList.remove('fa-eye-slash');
      icon.classList.add('fa-eye');
    }
  }

  async authenticate() {
    const apiKeyInput = document.getElementById('apiKey');
    const authenticateBtn = document.getElementById('authenticateBtn');
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      this.showStatus('Please enter your API key', 'error');
      return;
    }

    // Show loading state
    this.setButtonLoading(authenticateBtn, true);

    try {
      // Validate API key with real authentication server
      const userData = await this.validateApiKey(apiKey);

      // Save authentication data
      await chrome.storage.sync.set({
        apiKey: apiKey,
        isEnabled: true,
        user: userData
      });

      this.apiKey = apiKey;
      this.user = userData;
      this.isAuthenticated = true;
      this.isEnabled = true;

      this.showStatus('Authentication successful!', 'success');
      
      // Update UI after short delay
      setTimeout(() => {
        this.updateUI();
      }, 1000);

    } catch (error) {
      console.error('Authentication failed:', error);
      this.showStatus(error.message || 'Authentication failed', 'error');
    } finally {
      this.setButtonLoading(authenticateBtn, false);
    }
  }

  async validateApiKey(apiKey) {
    const authEndpoint = this.authUrl;
    
    try {
      console.log('Validating API key with server:', authEndpoint);
      
      const response = await fetch(authEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          apiKey: apiKey,
          action: 'validate',
          timestamp: new Date().toISOString(),
          source: 'chrome-extension'
        })
      });

      console.log('Auth response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key');
        } else if (response.status === 403) {
          throw new Error('API key expired or suspended');
        } else if (response.status === 429) {
          throw new Error('Too many authentication attempts. Please try again later');
        }
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Auth response data:', data);

      if (data.success && data.user) {
        return data.user;
      } else {
        throw new Error(data.message || 'Invalid API key');
      }
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        throw new Error('Unable to connect to authentication server. Please check your internet connection.');
      }
      throw error;
    }
  }

  async signOut() {
    const signOutBtn = document.getElementById('signOutBtn');
    this.setButtonLoading(signOutBtn, true);

    try {
      // Clear stored data
      await chrome.storage.sync.remove(['apiKey', 'user']);
      
      this.apiKey = '';
      this.user = null;
      this.isAuthenticated = false;
      
      this.showStatus('Signed out successfully', 'success');
      
      // Update UI after short delay
      setTimeout(() => {
        this.updateUI();
        // Clear the API key input
        const apiKeyInput = document.getElementById('apiKey');
        if (apiKeyInput) {
          apiKeyInput.value = '';
        }
      }, 1000);

    } catch (error) {
      console.error('Sign out failed:', error);
      this.showStatus('Sign out failed', 'error');
    } finally {
      this.setButtonLoading(signOutBtn, false);
    }
  }

  async toggleExtension() {
    const enableToggle = document.getElementById('enableToggle');
    const newState = !enableToggle.classList.contains('active');
    
    try {
      await chrome.storage.sync.set({ isEnabled: newState });
      this.isEnabled = newState;
      
      if (newState) {
        enableToggle.classList.add('active');
        this.showStatus('Extension enabled', 'success');
      } else {
        enableToggle.classList.remove('active');
        this.showStatus('Extension disabled', 'success');
      }
    } catch (error) {
      console.error('Failed to toggle extension:', error);
      this.showStatus('Failed to update settings', 'error');
    }
  }

  openDashboard(e) {
    e.preventDefault();
    chrome.tabs.create({ url: this.dashboardUrl });
  }

  showToneInfo(tone) {
    const toneDescriptions = {
      professional: 'Formal, business-appropriate responses',
      casual: 'Relaxed, friendly conversational tone',
      humorous: 'Witty and entertaining replies',
      empathetic: 'Understanding and supportive responses',
      analytical: 'Data-driven, logical responses',
      enthusiastic: 'Energetic and passionate replies'
    };

    const description = toneDescriptions[tone] || 'AI-generated response';
    this.showStatus(`${tone.charAt(0).toUpperCase() + tone.slice(1)}: ${description}`, 'success');
  }

  setButtonLoading(button, isLoading) {
    if (!button) return;

    if (isLoading) {
      button.disabled = true;
      button.classList.add('quirkly-pulse');
      const originalText = button.innerHTML;
      button.dataset.originalText = originalText;
      button.innerHTML = '<span class="quirkly-loader"></span> Loading...';
    } else {
      button.disabled = false;
      button.classList.remove('quirkly-pulse');
      if (button.dataset.originalText) {
        button.innerHTML = button.dataset.originalText;
        delete button.dataset.originalText;
      }
    }
  }

  showStatus(message, type) {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;

    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'flex';

    // Add icon based on type
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ⓘ';
    statusDiv.innerHTML = `${icon} ${message}`;

    // Hide status after 4 seconds
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 4000);
  }
}

// Safe initialization with context validation
function initializeQuirklyPopup() {
  // Check if extension context is valid before initializing
  if (!chrome.runtime?.id) {
    console.log('Quirkly Popup: Extension context not available, skipping initialization');
    return;
  }

  console.log('Quirkly Popup: Initializing...');
  
  try {
    new QuirklyPopup();
  } catch (error) {
    console.error('Quirkly Popup: Failed to initialize:', error);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  console.log('Quirkly Popup: DOMContentLoaded fired');
  initializeQuirklyPopup();
});

// Fallback initialization
if (document.readyState === 'loading') {
  console.log('Quirkly Popup: DOM still loading, waiting for DOMContentLoaded');
} else {
  console.log('Quirkly Popup: DOM already ready, initializing immediately');
  initializeQuirklyPopup();
}