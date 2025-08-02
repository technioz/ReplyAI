// ReplyAI Background Service Worker
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set default settings on first install
    chrome.storage.sync.set({
      n8nWebhookUrl: '',
      isEnabled: true
    });
    
    // Show a notification instead of opening welcome page
    console.log('ReplyAI installed successfully! Click the extension icon to configure.');
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'log') {
    console.log('ReplyAI:', request.message);
  }
  
  if (request.action === 'error') {
    console.error('ReplyAI Error:', request.message);
  }
}); 