#!/usr/bin/env node

/**
 * ReplyAI n8n Workflow Test Script
 * 
 * This script tests the production n8n workflow to ensure it's working correctly.
 * Usage: node test-workflow.js <webhook-url>
 */

const https = require('https');
const http = require('http');
const url = require('url');

// Test cases with different tones and posts
const testCases = [
  {
    name: "Professional DSA Question",
    data: {
      tone: "professional",
      originalPost: "Which language is best to start DSA?",
      userContext: {
        username: "testuser",
        displayName: "Test User",
        currentUrl: "https://twitter.com/test",
        pageTitle: "X"
      },
      timestamp: new Date().toISOString(),
      extensionVersion: "1.0.0"
    }
  },
  {
    name: "Casual Tech Discussion",
    data: {
      tone: "casual",
      originalPost: "Just learned React today! It's pretty cool but also confusing 😅",
      userContext: {
        username: "devuser",
        displayName: "Dev User",
        currentUrl: "https://twitter.com/dev",
        pageTitle: "X"
      },
      timestamp: new Date().toISOString(),
      extensionVersion: "1.0.0"
    }
  },
  {
    name: "Humorous Programming",
    data: {
      tone: "humorous",
      originalPost: "Debugging is like being a detective in a crime movie where you're also the murderer",
      userContext: {
        username: "coder",
        displayName: "Coder",
        currentUrl: "https://twitter.com/coder",
        pageTitle: "X"
      },
      timestamp: new Date().toISOString(),
      extensionVersion: "1.0.0"
    }
  },
  {
    name: "Empathetic Support",
    data: {
      tone: "empathetic",
      originalPost: "Feeling overwhelmed with my coding bootcamp. There's so much to learn and I'm falling behind",
      userContext: {
        username: "student",
        displayName: "Student",
        currentUrl: "https://twitter.com/student",
        pageTitle: "X"
      },
      timestamp: new Date().toISOString(),
      extensionVersion: "1.0.0"
    }
  },
  {
    name: "Analytical Comparison",
    data: {
      tone: "analytical",
      originalPost: "What are the pros and cons of using TypeScript vs JavaScript for a new project?",
      userContext: {
        username: "analyst",
        displayName: "Analyst",
        currentUrl: "https://twitter.com/analyst",
        pageTitle: "X"
      },
      timestamp: new Date().toISOString(),
      extensionVersion: "1.0.0"
    }
  },
  {
    name: "Enthusiastic Achievement",
    data: {
      tone: "enthusiastic",
      originalPost: "Just deployed my first app to production! 🚀 Can't believe I actually built something that works!",
      userContext: {
        username: "excited",
        displayName: "Excited Dev",
        currentUrl: "https://twitter.com/excited",
        pageTitle: "X"
      },
      timestamp: new Date().toISOString(),
      extensionVersion: "1.0.0"
    }
  }
];

// Error test cases
const errorTestCases = [
  {
    name: "Missing Tone",
    data: {
      originalPost: "This should fail because tone is missing",
      userContext: {},
      timestamp: new Date().toISOString(),
      extensionVersion: "1.0.0"
    }
  },
  {
    name: "Invalid Tone",
    data: {
      tone: "invalid_tone",
      originalPost: "This should fail because tone is invalid",
      userContext: {},
      timestamp: new Date().toISOString(),
      extensionVersion: "1.0.0"
    }
  },
  {
    name: "Missing Original Post",
    data: {
      tone: "professional",
      userContext: {},
      timestamp: new Date().toISOString(),
      extensionVersion: "1.0.0"
    }
  }
];

function makeRequest(webhookUrl, data) {
  return new Promise((resolve, reject) => {
    const parsedUrl = url.parse(webhookUrl);
    const isHttps = parsedUrl.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const postData = JSON.stringify(data);
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonResponse = JSON.parse(responseData);
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: jsonResponse
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: responseData
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(postData);
    req.end();
  });
}

async function runTests(webhookUrl) {
  console.log('🚀 ReplyAI n8n Workflow Test Suite');
  console.log('=====================================\n');
  console.log(`Testing webhook: ${webhookUrl}\n`);

  let passedTests = 0;
  let failedTests = 0;

  // Test successful cases
  console.log('✅ Testing Successful Cases:');
  console.log('----------------------------');
  
  for (const testCase of testCases) {
    try {
      console.log(`\n📝 Test: ${testCase.name}`);
      console.log(`   Tone: ${testCase.data.tone}`);
      console.log(`   Post: "${testCase.data.originalPost.substring(0, 50)}..."`);
      
      const startTime = Date.now();
      const response = await makeRequest(webhookUrl, testCase.data);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (response.statusCode === 200 && response.data.success) {
        console.log(`   ✅ PASSED (${duration}ms)`);
        console.log(`   Reply: "${response.data.reply}"`);
        console.log(`   Characters: ${response.data.characterCount}/280`);
        console.log(`   Request ID: ${response.data.requestId}`);
        passedTests++;
      } else {
        console.log(`   ❌ FAILED (${duration}ms)`);
        console.log(`   Status: ${response.statusCode}`);
        console.log(`   Error: ${response.data.error || 'Unknown error'}`);
        failedTests++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failedTests++;
    }
  }

  // Test error cases
  console.log('\n❌ Testing Error Cases:');
  console.log('----------------------');
  
  for (const testCase of errorTestCases) {
    try {
      console.log(`\n📝 Test: ${testCase.name}`);
      
      const startTime = Date.now();
      const response = await makeRequest(webhookUrl, testCase.data);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      if (response.statusCode === 200 && !response.data.success) {
        console.log(`   ✅ PASSED (${duration}ms) - Expected error caught`);
        console.log(`   Error: ${response.data.error}`);
        console.log(`   Error Type: ${response.data.errorType}`);
        passedTests++;
      } else {
        console.log(`   ❌ FAILED (${duration}ms) - Expected error but got success`);
        console.log(`   Status: ${response.statusCode}`);
        console.log(`   Response: ${JSON.stringify(response.data)}`);
        failedTests++;
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      failedTests++;
    }
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 All tests passed! Your n8n workflow is working correctly.');
  } else {
    console.log('\n⚠️  Some tests failed. Please check your workflow configuration.');
  }
}

// Main execution
if (require.main === module) {
  const webhookUrl = process.argv[2];
  
  if (!webhookUrl) {
    console.error('❌ Error: Please provide a webhook URL');
    console.log('Usage: node test-workflow.js <webhook-url>');
    console.log('Example: node test-workflow.js https://your-n8n-instance.com/webhook/replyai-webhook');
    process.exit(1);
  }
  
  runTests(webhookUrl).catch(error => {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runTests, testCases, errorTestCases }; 