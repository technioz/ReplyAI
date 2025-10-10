// Quirkly Background Service Worker - Premium Authentication Flow

// Import configuration
importScripts('config.js');
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Use production config directly
    const config = {
      environment: 'production',
      authUrl: 'https://quirkly.technioz.com/api/auth/validate',
      replyUrl: 'https://quirkly.technioz.com/api/reply/generate',
      profileUrl: 'https://quirkly.technioz.com/api/profile/extract',
      dashboardUrl: 'https://quirkly.technioz.com',
      isDev: false
    };
    console.log('Quirkly Background: Installing with config:', config);
    
    // Set default settings on first install
    chrome.storage.sync.set({
      isEnabled: false, // Disabled by default until authenticated
      apiKey: '',
      user: null,
      replyEndpoint: config.replyUrl
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
    
    // Use production config directly
    const config = {
      environment: 'production',
      authUrl: 'https://quirkly.technioz.com/api/auth/validate',
      replyUrl: 'https://quirkly.technioz.com/api/reply/generate',
      profileUrl: 'https://quirkly.technioz.com/api/profile/extract',
      dashboardUrl: 'https://quirkly.technioz.com',
      isDev: false
    };
    chrome.storage.sync.get(['replyEndpoint']).then((result) => {
      if (result.replyEndpoint && result.replyEndpoint !== config.replyUrl) {
        // Update to environment-specific webhook URL
        chrome.storage.sync.set({
          replyEndpoint: config.replyUrl
        });
        console.log('Quirkly: Updated reply endpoint to:', config.replyUrl);
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
  
  if (request.action === 'storeProfileData') {
    handleProfileDataStorage(request, sendResponse);
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'generateReply') {
    handleReplyGeneration(request, sendResponse);
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'setLoadingState') {
    handleLoadingState(request, sendResponse);
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'injectReplyIntoPage') {
    handleReplyInjection(request, sendResponse);
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
    const authEndpoint = 'https://quirkly.technioz.com/api/auth/validate';
    
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

// Get base URL based on environment
function getBaseUrl() {
  // Check if we're in development mode by looking at the manifest
  const manifest = chrome.runtime.getManifest();
  const isDev = manifest.name.includes('DEV') || manifest.name.includes('localhost');
  
  if (isDev) {
    console.log('Quirkly Background: Running in DEVELOPMENT mode');
    return 'http://localhost:3000';
  } else {
    console.log('Quirkly Background: Running in PRODUCTION mode');
    return 'https://quirkly.technioz.com';
  }
}

// Handle AI reply generation requests
async function handleReplyGeneration(request, sendResponse) {
  try {
    console.log('Quirkly Background: Handling reply generation request:', request);
    
    // Get stored API key and user data
    const result = await chrome.storage.sync.get(['apiKey', 'user']);
    if (!result.apiKey) {
      throw new Error('No API key found. Please authenticate first.');
    }
    
    const { tweetText, tone, userContext } = request;
    
    if (!tweetText || !tone) {
      throw new Error('Missing required parameters: tweetText and tone');
    }
    
    // Get environment-specific base URL
    const baseUrl = getBaseUrl();
    const replyEndpoint = `${baseUrl}/api/reply/generate`;
    
    console.log('Quirkly Background: Sending request to:', replyEndpoint);
    
    // Make the API request from background script (bypasses CORS)
    const response = await fetch(replyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${result.apiKey}`,
        'X-User-ID': result.user?.id || '',
        'X-Extension-Version': '1.0.0'
      },
      body: JSON.stringify({
        tweetText: tweetText,
        tone: tone,
        userContext: userContext || {},
        timestamp: new Date().toISOString(),
        source: 'chrome-extension-background'
      })
    });
    
    console.log('Quirkly Background: Response status:', response.status);
    
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
    
    const data = await response.json();
    console.log('Quirkly Background: Reply generated successfully:', data);
    
    // Deduct credits after successful reply generation
    if (data.success && result.user) {
      try {
        // Use environment-specific credit endpoint
        const baseUrl = getBaseUrl();
        const creditEndpoint = `${baseUrl}/api/credits/use`;
        console.log('Quirkly Background: Deducting credits from:', creditEndpoint);
        
        const creditResponse = await fetch(creditEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${result.apiKey}`,
            'X-User-ID': result.user?.id || '',
            'X-Extension-Version': '1.0.0'
          },
          body: JSON.stringify({
            amount: 1
          })
        });
        
        console.log('Quirkly Background: Credit deduction response status:', creditResponse.status);
        
        if (creditResponse.ok) {
          const creditData = await creditResponse.json();
          console.log('Quirkly Background: Credits deducted successfully:', creditData);
          
          // Update stored user data with new credit information
          if (creditData.credits) {
            result.user.credits = creditData.credits;
            await chrome.storage.sync.set({ user: result.user });
            console.log('Quirkly Background: Updated user credits in storage');
          }
        } else {
          const errorText = await creditResponse.text();
          console.warn('Quirkly Background: Failed to deduct credits:', {
            status: creditResponse.status,
            statusText: creditResponse.statusText,
            error: errorText
          });
        }
      } catch (creditError) {
        console.error('Quirkly Background: Error deducting credits:', {
          message: creditError.message,
          stack: creditError.stack,
          apiKey: result.apiKey ? `${result.apiKey.substring(0, 10)}...` : 'none',
          userId: result.user?.id || 'none'
        });
      }
    }
    
    sendResponse({ success: true, data: data });
    
  } catch (error) {
    console.error('Quirkly Background: Reply generation failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle loading state management
function handleLoadingState(request, sendResponse) {
  try {
    const { isLoading, tone, timestamp } = request;
    console.log(`Quirkly Background: Setting loading state: ${isLoading ? 'loading' : 'idle'} for tone: ${tone}`);
    
    // Store loading state in storage for other parts of extension to access
    chrome.storage.local.set({
      loadingState: {
        isLoading: isLoading,
        tone: tone,
        timestamp: timestamp,
        lastUpdated: Date.now()
      }
    });
    
    sendResponse({ success: true, loadingState: { isLoading, tone, timestamp } });
  } catch (error) {
    console.error('Quirkly Background: Failed to set loading state:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle reply injection into pages using chrome.scripting.executeScript
async function handleReplyInjection(request, sendResponse) {
  try {
    const { reply, pageUrl } = request;
    console.log('Quirkly Background: Injecting reply into page:', pageUrl);
    console.log('Quirkly Background: Reply text:', reply.substring(0, 100) + '...');
    
    // Get the active tab to inject the script
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab) {
      throw new Error('No active tab found');
    }
    
    console.log('Quirkly Background: Found active tab:', tab.id, tab.url);
    
    // Inject the reply injection script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: injectReplyIntoPage,
      args: [reply]
    });
    
    console.log('Quirkly Background: Script execution results:', results);
    
    if (results && results[0] && results[0].result !== undefined) {
      const success = results[0].result;
      if (success) {
        console.log('Quirkly Background: Reply injection successful');
        sendResponse({ success: true, message: 'Reply injected successfully' });
      } else {
        console.log('Quirkly Background: Reply injection script returned false');
        sendResponse({ success: false, error: 'Reply injection script returned false' });
      }
    } else {
      console.log('Quirkly Background: No result from script execution');
      sendResponse({ success: false, error: 'No result from script execution' });
    }
    
  } catch (error) {
    console.error('Quirkly Background: Reply injection failed:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Function that will be injected into the page
function injectReplyIntoPage(replyText) {
  try {
    console.log('Quirkly: Injecting reply into page:', replyText);
    
    // Try multiple injection methods with better Twitter compatibility
    let success = false;
    
    // Method 1: Target the specific Twitter reply textarea (most reliable)
    const twitterTextarea = document.querySelector('[data-testid="tweetTextarea_0"]');
    if (twitterTextarea) {
      try {
        console.log('Quirkly: Found Twitter textarea:', twitterTextarea);
        
        // Find the Draft.js content structure
        const draftContent = twitterTextarea.querySelector('[data-contents="true"]');
        if (draftContent) {
          console.log('Quirkly: Found Draft.js content structure:', draftContent);
          
          // Clear ALL existing content including placeholder text
          draftContent.innerHTML = '';
          
          // Create the complete span structure that Twitter expects
          const newSpan = document.createElement('span');
          newSpan.setAttribute('data-offset-key', 'quirkly-0-0');
          
          // Create the inner span with data-text="true" containing the reply
          const innerSpan = document.createElement('span');
          innerSpan.setAttribute('data-text', 'true');
          innerSpan.textContent = replyText;
          
          // Assemble the complete structure
          newSpan.appendChild(innerSpan);
          
          // Insert the complete span structure into the cleared Draft.js content
          draftContent.appendChild(newSpan);
          
          // Hide the placeholder text completely
          const placeholder = twitterTextarea.querySelector('.public-DraftEditorPlaceholder-root');
          if (placeholder) {
            placeholder.style.display = 'none';
            placeholder.style.visibility = 'hidden';
            placeholder.style.opacity = '0';
            console.log('Quirkly: Hidden placeholder text');
          }
          
          // Ensure our content is the only visible content
          draftContent.style.minHeight = 'auto';
          draftContent.style.height = 'auto';
          
          // Log the complete structure for debugging
          console.log('Quirkly: Created complete span structure:');
          console.log('Outer span:', newSpan.outerHTML);
          console.log('Inner span:', innerSpan.outerHTML);
          console.log('Full structure:', draftContent.innerHTML);
          
          // Ensure the structure is visible and properly formatted
          newSpan.style.display = 'inline';
          newSpan.style.visibility = 'visible';
          innerSpan.style.display = 'inline';
          innerSpan.style.visibility = 'visible';
          
          // Verify the structure was properly inserted
          setTimeout(() => {
            const insertedSpan = draftContent.querySelector('span[data-offset-key="quirkly-0-0"]');
            if (insertedSpan) {
              console.log('Quirkly: Span structure successfully inserted and verified:', insertedSpan.outerHTML);
              
              // Check if the text is visible
              const textSpan = insertedSpan.querySelector('span[data-text="true"]');
              if (textSpan && textSpan.textContent === replyText) {
                console.log('Quirkly: Text content verified:', textSpan.textContent);
              } else {
                console.warn('Quirkly: Text content verification failed');
              }
            } else {
              console.error('Quirkly: Span structure insertion verification failed');
            }
          }, 100);
        } else {
          // Fallback: direct text injection
          twitterTextarea.textContent = replyText;
        }
        
        // Trigger multiple events to ensure Twitter recognizes the change
        const events = ['input', 'change', 'keyup', 'paste', 'compositionend', 'keydown'];
        events.forEach(eventType => {
          try {
            const event = new Event(eventType, { bubbles: true, cancelable: true });
            twitterTextarea.dispatchEvent(event);
          } catch (e) {
            console.log(`Quirkly: Event ${eventType} failed:`, e);
          }
        });
        
        // Also trigger a focus event and ensure visibility
        try {
          twitterTextarea.focus();
          
          // Make sure the textarea is visible
          twitterTextarea.style.display = 'block';
          twitterTextarea.style.visibility = 'visible';
          twitterTextarea.style.opacity = '1';
          
          // Place cursor at the end of the text
          const range = document.createRange();
          const selection = window.getSelection();
          range.selectNodeContents(twitterTextarea);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);
          
          // Force a scroll into view
          twitterTextarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
          
        } catch (e) {
          console.log('Quirkly: Focus/cursor placement failed:', e);
        }
        
        success = true;
        console.log('Quirkly: Successfully injected into Twitter textarea with proper Draft.js structure');
      } catch (error) {
        console.log('Quirkly: Twitter textarea injection failed:', error);
      }
    }
    
    // Method 2: Look for any contenteditable element with data-testid (fallback)
    if (!success) {
      const contentEditable = document.querySelector('[contenteditable="true"][data-testid]:not([data-quirkly-extension])');
      if (contentEditable) {
        try {
          console.log('Quirkly: Found contenteditable with data-testid:', contentEditable);
          
          // Clear and set content
          contentEditable.textContent = '';
          contentEditable.textContent = replyText;
          
          // Trigger events
          const inputEvent = new Event('input', { bubbles: true, cancelable: true });
          contentEditable.dispatchEvent(inputEvent);
          
          // Focus with delay
          setTimeout(() => {
            try {
              contentEditable.focus();
            } catch (e) {
              console.log('Quirkly: Contenteditable focus failed:', e);
            }
          }, 100);
          
          success = true;
          console.log('Quirkly: Injected into contenteditable with data-testid');
        } catch (error) {
          console.log('Quirkly: Contenteditable with data-testid injection failed:', error);
        }
      }
    }
    
    // Method 3: Look for any contenteditable element (general fallback)
    if (!success) {
      const contentEditable = document.querySelector('[contenteditable="true"]:not([data-quirkly-extension])');
      if (contentEditable) {
        try {
          console.log('Quirkly: Found general contenteditable element:', contentEditable);
          
          // Clear and set content
          contentEditable.textContent = '';
          contentEditable.textContent = replyText;
          
          // Trigger events
          const inputEvent = new Event('input', { bubbles: true, cancelable: true });
          contentEditable.dispatchEvent(inputEvent);
          
          // Focus with delay
          setTimeout(() => {
            try {
              contentEditable.focus();
            } catch (e) {
              console.log('Quirkly: General contenteditable focus failed:', e);
            }
          }, 100);
          
          success = true;
          console.log('Quirkly: Injected into general contenteditable element');
        } catch (error) {
          console.log('Quirkly: General contenteditable injection failed:', error);
        }
      }
    }
    
    // Method 4: Try to simulate typing (most Twitter-compatible)
    if (!success) {
      try {
        console.log('Quirkly: Trying typing simulation method...');
        
        // Find the Twitter textarea specifically
        const inputArea = document.querySelector('[data-testid="tweetTextarea_0"]');
        
        if (inputArea) {
          console.log('Quirkly: Found input area for typing simulation:', inputArea);
          
          // Focus first
          inputArea.focus();
          
          // Clear existing content
          inputArea.textContent = '';
          
          // Simulate typing character by character
          let currentText = '';
          const typeInterval = setInterval(() => {
            if (currentText.length < replyText.length) {
              const nextChar = replyText[currentText.length];
              currentText += nextChar;
              
              inputArea.textContent = currentText;
              
              // Trigger input event
              const inputEvent = new Event('input', { bubbles: true, cancelable: true });
              inputArea.dispatchEvent(inputEvent);
            } else {
              clearInterval(typeInterval);
              console.log('Quirkly: Typing simulation completed');
            }
          }, 30); // Type every 30ms for faster typing
          
          success = true;
          console.log('Quirkly: Started typing simulation');
        }
      } catch (error) {
        console.log('Quirkly: Typing simulation failed:', error);
      }
    }
    
    // Method 5: Create floating text area if nothing else works (least disruptive)
    if (!success) {
      try {
        console.log('Quirkly: Creating floating text area as fallback...');
        
        const floatingTextArea = document.createElement('textarea');
        floatingTextArea.value = replyText;
        floatingTextArea.setAttribute('data-quirkly-extension', 'true');
        floatingTextArea.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10000;
          width: 500px;
          height: 200px;
          padding: 20px;
          border: 3px solid #1DA1F2;
          border-radius: 12px;
          font-size: 16px;
          background: white;
          color: black;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
          font-family: Arial, sans-serif;
        `;
        floatingTextArea.placeholder = 'Generated Reply (copy and paste into Twitter)';
        
        // Add to body with minimal disruption
        document.body.appendChild(floatingTextArea);
        
        // Focus and select with delay
        setTimeout(() => {
          try {
            floatingTextArea.focus();
            floatingTextArea.select();
          } catch (e) {
            console.log('Quirkly: Floating textarea focus failed');
          }
        }, 100);
        
        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.setAttribute('data-quirkly-extension', 'true');
        closeBtn.style.cssText = `
          position: absolute;
          top: 10px;
          right: 10px;
          background: #1DA1F2;
          color: white;
          border: none;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          font-size: 20px;
          cursor: pointer;
        `;
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
      } catch (error) {
        console.log('Quirkly: Floating textarea creation failed:', error);
      }
    }
    
    // Show success message with minimal interference
    if (success) {
      try {
        const successDiv = document.createElement('div');
        successDiv.textContent = 'Reply generated and inserted successfully! ✨';
        successDiv.setAttribute('data-quirkly-extension', 'true');
        successDiv.style.cssText = `
          position: fixed;
          top: 20px;
          right: 20px;
          background: #16A34A;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          z-index: 10001;
          font-family: Arial, sans-serif;
          font-size: 14px;
          pointer-events: none;
        `;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
      } catch (error) {
        console.log('Quirkly: Success message failed:', error);
      }
    }
    
    return success;
    
  } catch (error) {
    console.error('Quirkly: Error in page injection:', error);
    return false;
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

    const authEndpoint = 'https://quirkly.technioz.com/api/auth/validate';
    
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

// Handle profile data storage
async function handleProfileDataStorage(request, sendResponse) {
  try {
    console.log('Quirkly Background: Handling profile data storage:', request);
    
    const { profileData, userId } = request;
    
    console.log('Quirkly Background: Profile data keys:', Object.keys(profileData || {}));
    console.log('Quirkly Background: User ID:', userId, 'Type:', typeof userId);
    
    if (!profileData || !userId) {
      throw new Error('Missing profile data or user ID');
    }
    
    // Get stored API key
    const result = await chrome.storage.sync.get(['apiKey']);
    if (!result.apiKey) {
      throw new Error('No API key found. Please authenticate first.');
    }
    
    // Use production profile endpoint
    const profileEndpoint = 'https://quirkly.technioz.com/api/profile/extract';
    
    console.log('Quirkly Background: Sending profile data to:', profileEndpoint);
    
    // Make the API request to store profile data
    const response = await fetch(profileEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${result.apiKey}`,
        'X-User-ID': userId,
        'X-Extension-Version': '1.0.0'
      },
      body: JSON.stringify({
        profileData: profileData,
        userId: userId,
        timestamp: new Date().toISOString(),
        source: 'chrome-extension-background'
      })
    });
    
    console.log('Quirkly Background: Profile storage response status:', response.status);
    
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
    
    const data = await response.json();
    console.log('Quirkly Background: Profile data stored successfully:', data);
    
    sendResponse({ success: true, data: data });
    
  } catch (error) {
    console.error('Quirkly Background: Profile data storage failed:', error);
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