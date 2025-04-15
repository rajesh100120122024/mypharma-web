import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';

// Safer way to configure logging
try {
  // Check if Logger exists before setting log level
  if (Amplify.Logger) {
    Amplify.Logger.LOG_LEVEL = 'DEBUG';
  } else {
    console.warn('Amplify Logger not found. Logging configuration skipped.');
  }
} catch (error) {
  console.error('Error configuring Amplify Logger:', error);
}

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
        region: 'ap-south-1'
      },
      stepFunctions: {
        endpoint: 'https://zo1cswzvkg.execute-api.ap-south-1.amazonaws.com/prod',
        region: 'ap-south-1'
      }
    }
  }
};

// Configure Amplify with error handling
try {
  Amplify.configure(amplifyCfg);
} catch (error) {
  console.error('Error configuring Amplify:', error);
}

export default Amplify;