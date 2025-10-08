// Dashboard Configuration
// Environment-based configuration for different deployment stages

interface Config {
  environment: 'development' | 'production';
  authUrl: string;
  replyUrl: string;
  dashboardUrl: string;
  isDev: boolean;
}

const QuirklyDashboardConfig = {
  // Environment detection
  isDevelopment: (): boolean => {
    return process.env.NODE_ENV === 'development' || 
           process.env.NEXT_PUBLIC_ENV === 'development' ||
           typeof window !== 'undefined' && window.location.hostname === 'localhost';
  },

  // Base URLs for different environments
  environments: {
    development: {
      baseUrl: 'http://localhost:3000',
      authEndpoint: '/api/auth/login',
      replyEndpoint: '/api/reply/generate',
      subscriptionEndpoint: '/api/subscription',
      userEndpoint: '/api/user',
      creditsEndpoint: '/api/credits',
      profileEndpoint: '/api/profile',
      dashboardUrl: 'http://localhost:3000'
    },
    production: {
      // Using Vercel deployment URL (update with custom domain when available)
      baseUrl: 'https://quirkly.vercel.app',
      authEndpoint: '/api/auth/login',
      replyEndpoint: '/api/reply/generate',
      subscriptionEndpoint: '/api/subscription',
      userEndpoint: '/api/user',
      creditsEndpoint: '/api/credits',
      profileEndpoint: '/api/profile',
      dashboardUrl: 'https://quirkly.vercel.app'
    }
  },

  // Get current environment configuration
  getConfig: function(): Config {
    const env = this.isDevelopment() ? 'development' : 'production';
    const config = this.environments[env];
    
    return {
      environment: env,
      authUrl: config.baseUrl + config.authEndpoint,
      replyUrl: config.baseUrl + config.replyEndpoint,
      dashboardUrl: config.dashboardUrl,
      isDev: env === 'development'
    };
  },

  // Get specific URLs
  getAuthUrl: function(): string {
    return this.getConfig().authUrl;
  },

  getValidationUrl: function(): string {
    const env = this.isDevelopment() ? 'development' : 'production';
    const config = this.environments[env];
    return config.baseUrl + '/api/auth/validate';
  },

  getTestUrl: function(): string {
    const env = this.isDevelopment() ? 'development' : 'production';
    const config = this.environments[env];
    return config.baseUrl + '/api/test';
  },

  getReplyUrl: function(): string {
    return this.getConfig().replyUrl;
  },

  getDashboardUrl: function(): string {
    return this.getConfig().dashboardUrl;
  },

  getSubscriptionUrl: function(): string {
    const env = this.isDevelopment() ? 'development' : 'production';
    const config = this.environments[env];
    return config.baseUrl + config.subscriptionEndpoint;
  },

  getUserUrl: function(): string {
    const env = this.isDevelopment() ? 'development' : 'production';
    const config = this.environments[env];
    return config.baseUrl + config.userEndpoint;
  },

  getCreditsUrl: function(): string {
    const env = this.isDevelopment() ? 'development' : 'production';
    const config = this.environments[env];
    return config.baseUrl + config.creditsEndpoint;
  },

  getApiBaseUrl: function(): string {
    const env = this.isDevelopment() ? 'development' : 'production';
    const config = this.environments[env];
    return config.baseUrl + '/api';
  },

  getProfileUrl: function(): string {
    const env = this.isDevelopment() ? 'development' : 'production';
    const config = this.environments[env];
    return config.baseUrl + config.profileEndpoint;
  },

  // Debug info
  getEnvironmentInfo: function(): Config {
    const config = this.getConfig();
    console.log('Quirkly Dashboard Environment Info:', {
      environment: config.environment,
      authUrl: config.authUrl,
      replyUrl: config.replyUrl,
      dashboardUrl: config.dashboardUrl,
      nodeEnv: process.env.NODE_ENV,
      nextPublicEnv: process.env.NEXT_PUBLIC_ENV
    });
    return config;
  }
};

export default QuirklyDashboardConfig;
