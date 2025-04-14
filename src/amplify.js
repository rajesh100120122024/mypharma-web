// src/amplify.js   (or amplify.ts)
import { Amplify } from 'aws-amplify';
import awsExports from './aws-exports';
Amplify.configure(awsExports);

Amplify.configure({
  Auth: {
    /* v6 requires a Cognito wrapper */
    Cognito: {
      identityPoolId: 'ap-south-1:9886cb04-dc64-4bf9-b99d-9c23e36ab016',
      region: 'ap-south-1',
      allowGuestAccess: true
      /* allowGuestAccess: true  // optional */
    }
  },

  Storage: {
    /* v6 requires an S3 wrapper */
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
});

export default Amplify;
