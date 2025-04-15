import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';

// Validate configuration function
const validateConfig = (config) => {
  const requiredKeys = [
    'Auth.Cognito.identityPoolId', 
    'Auth.Cognito.region', 
    'Storage.S3.bucket', 
    'Storage.S3.region',
    'API.REST.pdfProcessor.endpoint',
    'API.REST.stepFunctions.endpoint'
  ];

  requiredKeys.forEach(key => {
    const value = key.split('.').reduce((obj, k) => obj?.[k], config);
    if (!value) {
      console.warn(`⚠️ Missing configuration for: ${key}`);
    }
  });
};

// Base Amplify Configuration
const amplifyCfg = {
  Auth: {
    Cognito: {
      identityPoolId: 'ap-south-1:9886cb04-dc64-4bf9-b99d-9c23e36ab016',
      region: 'ap-south-1',
      allowGuestAccess: true
    }
  },

  Storage: {
    S3: {
      bucket: 'pdf-upload-bucket-mypharma',
      region: 'ap-south-1',
      defaultAccessLevel: 'guest'
    }
  },

  API: {
    REST: {
      pdfProcessor: {
        endpoint: 'https://inordedh6h.execute-api.ap-south-1.amazonaws.com/Prod',
        region: 'ap-south-1',
        // Additional API configuration
        custom: {
          headers: {
            'Content-Type': 'application/json',
            // Optional: Add any additional headers
            // 'X-Custom-Header': 'value'
          },
          // Optional timeout configuration
          requestTimeout: 30000 // 30 seconds
        }
      },
      stepFunctions: {
        endpoint: 'https://zo1cswzvkg.execute-api.ap-south-1.amazonaws.com/prod',
        region: 'ap-south-1',
        custom: {
          headers: {
            'Content-Type': 'application/json'
          },
          requestTimeout: 30000 // 30 seconds
        }
      }
    }
  }
};

// Enable debugging mode
Amplify.Logger.LOG_LEVEL = 'DEBUG';

// Validate configuration before applying
validateConfig(amplifyCfg);

// Configure Amplify
Amplify.configure(amplifyCfg);

// Additional error handling
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled Promise Rejection:', event.reason);
});

export default Amplify;