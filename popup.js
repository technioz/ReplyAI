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
    
    // Start data refresh if already authenticated
    if (this.isAuthenticated) {
      this.startDataRefresh();
    }
    
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
      apiKeyInput.addEventListener('keypress', async (e) => {
        if (e.key === 'Enter') {
          const apiKey = e.target.value.trim();
          if (apiKey) {
            try {
              this.setButtonLoading(authenticateBtn, true);
              
              // Show loading state for data fields
              this.showLoadingState();
              
              const result = await this.authenticate(apiKey);
              
              // Store the API key and user data
              this.apiKey = apiKey;
              this.user = result.user;
              this.isAuthenticated = true;
              
              await chrome.storage.sync.set({ 
                apiKey: apiKey, 
                user: result.user 
              });
              
              // Start data refresh
              this.startDataRefresh();
              
              this.showStatus('Authentication successful!', 'success');
              this.updateUI();
              
            } catch (error) {
              console.error('Authentication failed:', error);
              this.showStatus(error.message || 'Authentication failed', 'error');
            } finally {
              this.setButtonLoading(authenticateBtn, false);
              this.hideLoadingState();
            }
          }
        }
      });
    }

    if (toggleApiKeyBtn) {
      toggleApiKeyBtn.addEventListener('click', this.toggleApiKeyVisibility.bind(this));
    }

    if (authenticateBtn) {
      authenticateBtn.addEventListener('click', async () => {
        const apiKeyInput = document.getElementById('apiKey');
        const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
        if (apiKey) {
          try {
            this.setButtonLoading(authenticateBtn, true);
            
            // Show loading state for data fields
            this.showLoadingState();
            
            const result = await this.authenticate(apiKey);
            
            // Store the API key and user data
            this.apiKey = apiKey;
            this.user = result.user;
            this.isAuthenticated = true;
            
            await chrome.storage.sync.set({ 
              apiKey: apiKey, 
              user: result.user 
            });
            
            // Start data refresh
            this.startDataRefresh();
            
            this.showStatus('Authentication successful!', 'success');
            this.updateUI();
            
          } catch (error) {
            console.error('Authentication failed:', error);
            this.showStatus(error.message || 'Authentication failed', 'error');
          } finally {
            this.setButtonLoading(authenticateBtn, false);
            this.hideLoadingState();
          }
        }
      });
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
    const userStatus = document.getElementById('userStatus');

    if (this.user && userInitials && userEmail) {
      // Set user initials
      const initials = this.user.fullName 
        ? this.user.fullName.split(' ').map(n => n[0]).join('').toUpperCase()
        : this.user.email.charAt(0).toUpperCase();
      
      userInitials.textContent = initials;
      userEmail.textContent = this.user.fullName || this.user.email;
      
      // Set user status
      if (userStatus) {
        if (this.user.status === 'active') {
          userStatus.textContent = 'Active';
          userStatus.className = 'user-status active';
        } else if (this.user.status === 'suspended') {
          userStatus.textContent = 'Suspended';
          userStatus.className = 'user-status suspended';
        } else {
          userStatus.textContent = this.user.status || 'Authenticated';
          userStatus.className = 'user-status';
        }
      }
    }
  }

  updateStats() {
    const apiCallsUsed = document.getElementById('apiCallsUsed');
    const apiCallsLimit = document.getElementById('apiCallsLimit');
    const subscriptionStatus = document.getElementById('subscriptionStatus');
    const userCredits = document.getElementById('userCredits');

    if (this.user) {
      // API Calls Used and Limit
      if (apiCallsUsed && apiCallsLimit) {
        const used = this.user.apiCallsUsed || this.user.monthlyApiCalls || 0;
        const limit = this.user.apiCallsLimit || 100;
        
        apiCallsUsed.textContent = used;
        apiCallsLimit.textContent = limit;
        
        // Add visual indicator for usage
        const usagePercentage = (used / limit) * 100;
        if (usagePercentage > 80) {
          apiCallsUsed.style.color = '#ef4444'; // Red for high usage
        } else if (usagePercentage > 60) {
          apiCallsUsed.style.color = '#f59e0b'; // Yellow for medium usage
        } else {
          apiCallsUsed.style.color = '#10b981'; // Green for low usage
        }
      }
      
      // Subscription Status
      if (subscriptionStatus) {
        const plan = this.user.subscriptionPlan || 'Free';
        subscriptionStatus.textContent = plan;
        
        // Add visual styling based on plan
        if (plan === 'Free') {
          subscriptionStatus.style.color = '#6b7280';
        } else if (plan === 'Pro') {
          subscriptionStatus.style.color = '#10b981';
        } else if (plan === 'Enterprise') {
          subscriptionStatus.style.color = '#8b5cf6';
        }
      }
      
      // User Credits
      if (userCredits) {
        let credits = 0;
        
        // Handle different credit formats
        if (typeof this.user.credits === 'number') {
          credits = this.user.credits;
        } else if (this.user.credits && typeof this.user.credits === 'object') {
          // If credits is an object, get the available amount
          credits = this.user.credits.available || 0;
        } else {
          credits = 0;
        }
        
        userCredits.textContent = credits;
        
        // Add visual indicator for credits
        if (credits === 0) {
          userCredits.style.color = '#ef4444'; // Red for no credits
        } else if (credits < 10) {
          userCredits.style.color = '#f59e0b'; // Yellow for low credits
        } else {
          userCredits.style.color = '#10b981'; // Green for sufficient credits
        }
      }
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

  async authenticate(apiKey) {
    try {
      console.log('🔍 Starting authentication via background script...');
      
      // Use message passing to background script instead of direct fetch
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'authenticate',
          apiKey: apiKey
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
      
      console.log('✅ Authentication successful:', response);
      return response;
    } catch (error) {
      console.error('❌ Authentication failed:', error);
      throw error;
    }
  }

  async signOut() {
    const signOutBtn = document.getElementById('signOutBtn');
    this.setButtonLoading(signOutBtn, true);

    try {
      // Stop data refresh
      this.stopDataRefresh();
      
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

  async refreshUserData() {
    if (!this.apiKey || !this.isAuthenticated) {
      return;
    }
    
    try {
      console.log('🔄 Refreshing user data via background script...');
      
      // Use message passing to background script instead of direct fetch
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({
          action: 'refreshUser'
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
      
      if (response.success && response.user) {
        // Update user object with fresh data
        this.user = response.user;
        await chrome.storage.sync.set({ user: this.user });
        this.updateStats();
        console.log('✅ User data refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Failed to refresh user data:', error);
      // Don't show error to user for background refresh
    }
  }

  startDataRefresh() {
    // Refresh user data every 5 minutes
    if (this.dataRefreshInterval) {
      clearInterval(this.dataRefreshInterval);
    }
    
    this.dataRefreshInterval = setInterval(() => {
      // Check if extension context is still valid
      if (!this.isExtensionContextValid()) {
        console.log('Quirkly Popup: Extension context lost during refresh, stopping...');
        this.handleContextInvalidation();
        return;
      }
      
      this.refreshUserData();
    }, 5 * 60 * 1000); // 5 minutes
    
    console.log('🔄 Started periodic user data refresh');
  }

  stopDataRefresh() {
    if (this.dataRefreshInterval) {
      clearInterval(this.dataRefreshInterval);
      this.dataRefreshInterval = null;
      console.log('🔄 Stopped periodic user data refresh');
    }
  }

  showLoadingState() {
    const elements = ['apiCallsUsed', 'apiCallsLimit', 'subscriptionStatus', 'userCredits', 'userInitials', 'userEmail'];
    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.textContent = '...';
        element.style.opacity = '0.6';
      }
    });
  }

  hideLoadingState() {
    const elements = ['apiCallsUsed', 'apiCallsLimit', 'subscriptionStatus', 'userCredits', 'userInitials', 'userEmail'];
    elements.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        element.style.opacity = '1';
      }
    });
  }

  // Check if extension context is still valid
  isExtensionContextValid() {
    return !!(chrome.runtime && chrome.runtime.id);
  }

  // Handle extension context invalidation
  handleContextInvalidation() {
    console.log('Quirkly Popup: Extension context invalidated, attempting to reconnect...');
    
    // Clear any existing intervals
    this.stopDataRefresh();
    
    // Show message to user
    this.showStatus('Extension disconnected. Please reload the extension.', 'error');
    
    // Try to reinitialize after a short delay
    setTimeout(() => {
      if (this.isExtensionContextValid()) {
        console.log('Quirkly Popup: Extension context restored, reinitializing...');
        this.init();
      } else {
        console.log('Quirkly Popup: Extension context still invalid');
      }
    }, 2000);
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
    // Create popup instance
    window.quirklyPopup = new QuirklyPopup();
    console.log('Quirkly Popup: Initialization complete');
  } catch (error) {
    if (error.message?.includes('Extension context invalidated')) {
      console.log('Quirkly Popup: Extension context invalidated during initialization');
      return;
    }
    console.error('Quirkly Popup: Initialization failed:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeQuirklyPopup);
} else {
  initializeQuirklyPopup();
}