// Quirkly Extension Configuration
// Environment-based configuration for different deployment stages

const QuirklyConfig = {
  // Environment detection
  isDevelopment: () => {
    // Force production mode to use live URLs
    // Set to true manually if you need to test with localhost
    return false; // Always use production URLs
  },

  // Base URLs for different environments
  environments: {
    development: {
      baseUrl: 'http://localhost:3000',
      authEndpoint: '/api/auth/validate',
      replyEndpoint: '/api/reply/generate',
      profileEndpoint: '/api/profile/extract',
      dashboardUrl: 'http://localhost:3000'
    },
    production: {
      // Using Vercel deployment URL (update with custom domain when available)
      baseUrl: 'https://quirkly.technioz.com', 
      authEndpoint: '/api/auth/validate',
      replyEndpoint: '/api/reply/generate',
      profileEndpoint: '/api/profile/extract',
      dashboardUrl: 'https://quirkly.technioz.com'
    }
  },

  // Get current environment configuration
  getConfig: function() {
    const env = this.isDevelopment() ? 'development' : 'production';
    const config = this.environments[env];
    
    return {
      environment: env,
      baseUrl: config.baseUrl,
      authUrl: config.baseUrl + config.authEndpoint,
      replyUrl: config.baseUrl + config.replyEndpoint,
      profileUrl: config.baseUrl + config.profileEndpoint,
      dashboardUrl: config.dashboardUrl,
      isDev: env === 'development'
    };
  },

  // Get specific URLs
  getAuthUrl: function() {
    return this.getConfig().authUrl;
  },

  getReplyUrl: function() {
    return this.getConfig().replyUrl;
  },

  getDashboardUrl: function() {
    return this.getConfig().dashboardUrl;
  },

  getProfileUrl: function() {
    return this.getConfig().profileUrl;
  },

  // Debug info
  getEnvironmentInfo: function() {
    const config = this.getConfig();
    console.log('Quirkly Environment Info:', {
      environment: config.environment,
      authUrl: config.authUrl,
      replyUrl: config.replyUrl,
      dashboardUrl: config.dashboardUrl,
      manifestHasUpdateUrl: 'update_url' in chrome.runtime.getManifest(),
      manifestVersion: chrome.runtime.getManifest().version
    });
    return config;
  }
};

// Make it available globally
if (typeof window !== 'undefined') {
  window.QuirklyConfig = QuirklyConfig;
}

// Export for modules (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = QuirklyConfig;
}
