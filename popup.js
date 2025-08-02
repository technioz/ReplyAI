// ReplyAI Popup Script
document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('settingsForm');
  const webhookInput = document.getElementById('n8nWebhookUrl');
  const enableToggle = document.getElementById('enableToggle');
  const saveBtn = document.getElementById('saveBtn');
  const statusDiv = document.getElementById('status');

  // Load saved settings
  loadSettings();

  // Toggle functionality
  enableToggle.addEventListener('click', function() {
    enableToggle.classList.toggle('active');
  });

  // Form submission
  form.addEventListener('submit', function(e) {
    e.preventDefault();
    saveSettings();
  });

  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['n8nWebhookUrl', 'isEnabled']);
      
      if (result.n8nWebhookUrl) {
        webhookInput.value = result.n8nWebhookUrl;
      }
      
      if (result.isEnabled !== false) {
        enableToggle.classList.add('active');
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      showStatus('Error loading settings', 'error');
    }
  }

  async function saveSettings() {
    const webhookUrl = webhookInput.value.trim();
    const isEnabled = enableToggle.classList.contains('active');

    // Validate webhook URL
    if (!webhookUrl) {
      showStatus('Please enter a valid webhook URL', 'error');
      return;
    }

    try {
      // Test webhook URL format
      new URL(webhookUrl);
    } catch (error) {
      showStatus('Please enter a valid URL', 'error');
      return;
    }

    // Disable save button during save
    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';

    try {
      // Save to Chrome storage
      await chrome.storage.sync.set({
        n8nWebhookUrl: webhookUrl,
        isEnabled: isEnabled
      });

      // Notify content script about settings update
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && (tab.url.includes('twitter.com') || tab.url.includes('x.com'))) {
        await chrome.tabs.sendMessage(tab.id, { action: 'settingsUpdated' });
      }

      showStatus('Settings saved successfully!', 'success');
      
      // Re-enable save button
      setTimeout(() => {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Settings';
      }, 2000);

    } catch (error) {
      console.error('Error saving settings:', error);
      showStatus('Error saving settings', 'error');
      
      // Re-enable save button
      saveBtn.disabled = false;
      saveBtn.textContent = 'Save Settings';
    }
  }

  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = 'block';

    // Hide status after 3 seconds
    setTimeout(() => {
      statusDiv.style.display = 'none';
    }, 3000);
  }

  // Auto-save on input change (debounced)
  let saveTimeout;
  webhookInput.addEventListener('input', function() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (webhookInput.value.trim()) {
        saveSettings();
      }
    }, 1000);
  });

  // Auto-save on toggle change
  enableToggle.addEventListener('click', function() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveSettings();
    }, 500);
  });
}); 