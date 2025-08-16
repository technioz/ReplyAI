// Quirkly Background Service Worker - Premium Authentication Flow

// Import configuration
importScripts('config.js');
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Get environment-specific URLs
    const config = QuirklyConfig.getConfig();
    console.log('Quirkly Background: Installing with config:', config);
    
    // Set default settings on first install
    chrome.storage.sync.set({
      isEnabled: false, // Disabled by default until authenticated
      apiKey: '',
      user: null,
      n8nWebhookUrl: config.replyUrl
    });
    
    // Show welcome notification
    console.log('Quirkly installed successfully! Click the extension icon to authenticate and get started.');
    
    // Optionally open the dashboard for user registration
    chrome.tabs.create({ 
      url: config.dashboardUrl + '/?utm_source=extension&utm_medium=install',
      active: false 
    });
  }
  
  if (details.reason === 'update') {
    console.log('Quirkly updated to version:', chrome.runtime.getManifest().version);
    
    // Migrate old settings if needed
    const config = QuirklyConfig.getConfig();
    chrome.storage.sync.get(['n8nWebhookUrl']).then((result) => {
      if (result.n8nWebhookUrl && result.n8nWebhookUrl !== config.replyUrl) {
        // Update to environment-specific webhook URL
        chrome.storage.sync.set({
          n8nWebhookUrl: config.replyUrl
        });
        console.log('Quirkly: Updated webhook URL to:', config.replyUrl);
      }
    });
  }
});

  // Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Quirkly Background: Received message:', request);
  
  if (request.action === 'log') {
    console.log('Quirkly:', request.message);
  }
  
  if (request.action === 'error') {
    console.error('Quirkly Error:', request.message);
  }
  
  if (request.action === 'authenticate') {
    handleAuthentication(request.apiKey, sendResponse);
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'getAuthStatus') {
    getAuthenticationStatus(sendResponse);
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'updateStats') {
    updateUserStats(request.stats, sendResponse);
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'refreshUser') {
    refreshUserData(sendResponse);
    return true; // Keep the message channel open for async response
  }
});

// Handle authentication requests
async function handleAuthentication(apiKey, sendResponse) {
  try {
    console.log('Quirkly Background: Handling authentication');
    
    // Validate API key format
    if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 10) {
      throw new Error('Invalid API key format');
    }
    
    // Validate API key with real authentication server
    const authEndpoint = QuirklyConfig.getAuthUrl();
    
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
        source: 'chrome-extension-background'
      })
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid API key');
      } else if (response.status === 403) {
        throw new Error('API key expired or suspended');
      }
      throw new Error('Authentication server error');
    }

    const data = await response.json();
    
    if (data.success && data.user) {
      await chrome.storage.sync.set({
        apiKey: apiKey,
        user: data.user,
        isEnabled: true
      });
      
      sendResponse({ success: true, user: data.user });
    } else {
      throw new Error(data.message || 'Invalid API key');
    }
  } catch (error) {
    console.error('Quirkly Background: Authentication failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Get current authentication status
async function getAuthenticationStatus(sendResponse) {
  try {
    const result = await chrome.storage.sync.get(['apiKey', 'user', 'isEnabled']);
    const isAuthenticated = !!(result.apiKey && result.user);
    
    sendResponse({
      isAuthenticated: isAuthenticated,
      user: result.user || null,
      isEnabled: result.isEnabled !== false
    });
  } catch (error) {
    console.error('Quirkly Background: Failed to get auth status:', error);
    sendResponse({
      isAuthenticated: false,
      user: null,
      isEnabled: false
    });
  }
}

// Update user statistics
async function updateUserStats(stats, sendResponse) {
  try {
    const result = await chrome.storage.sync.get(['user']);
    if (result.user && stats) {
      const updatedUser = { ...result.user, ...stats };
      await chrome.storage.sync.set({ user: updatedUser });
      sendResponse({ success: true, user: updatedUser });
    } else {
      throw new Error('No user data found');
    }
  } catch (error) {
    console.error('Quirkly Background: Failed to update stats:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Real API key validation with n8n authentication endpoint
async function validateApiKeyWithServer(apiKey) {
  const authEndpoint = QuirklyConfig.getAuthUrl();
  
  try {
    console.log('Background: Validating API key with server');
    
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
        source: 'chrome-extension-background'
      })
    });

    if (!response.ok) {
      console.error('Background: Auth validation failed:', response.status);
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Background: API key validation error:', error);
    return false;
  }
}

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  console.log('Quirkly: Extension icon clicked');
  // The popup will handle the UI, this is just for logging
});

// Monitor storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  console.log('Quirkly Background: Storage changed:', changes);
  
  if (changes.apiKey || changes.user) {
    console.log('Quirkly Background: Authentication data changed');
  }
  
  if (changes.isEnabled) {
    console.log('Quirkly Background: Extension enabled state changed:', changes.isEnabled.newValue);
  }
});

// Refresh user data from server
async function refreshUserData(sendResponse) {
  try {
    const result = await chrome.storage.sync.get(['apiKey']);
    if (!result.apiKey) {
      throw new Error('No API key found');
    }

    const authEndpoint = QuirklyConfig.getAuthUrl();
    
    const response = await fetch(authEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        apiKey: result.apiKey,
        action: 'refresh',
        timestamp: new Date().toISOString(),
        source: 'chrome-extension-background'
      })
    });

    if (!response.ok) {
      throw new Error('Failed to refresh user data');
    }

    const data = await response.json();
    
    if (data.success && data.user) {
      await chrome.storage.sync.set({ 
        user: data.user,
        lastSync: Date.now()
      });
      sendResponse({ success: true, user: data.user });
    } else {
      throw new Error('Invalid refresh response');
    }
  } catch (error) {
    console.error('Quirkly Background: Failed to refresh user data:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Periodic cleanup and maintenance
setInterval(async () => {
  try {
    // Check if user data needs refreshing
    const result = await chrome.storage.sync.get(['user', 'lastSync', 'apiKey']);
    const now = Date.now();
    const lastSync = result.lastSync || 0;
    
    // Sync every hour if user is authenticated
    if (now - lastSync > 3600000 && result.user && result.apiKey) {
      console.log('Quirkly Background: Auto-syncing user data...');
      refreshUserData(() => {}); // Silent refresh
    }
  } catch (error) {
    console.error('Quirkly Background: Maintenance error:', error);
  }
}, 300000); // Run every 5 minutes 