import { Amplify } from 'aws-amplify';

Amplify.configure({
  Auth: {
    // OPTIONAL - if your API requires authentication
    identityPoolId: 'ap-south-1:ap-south-1:fb067313-2014-4a88-94ce-63df042d5d91',
    region: 'ap-south-1',
  },
  Storage: {
    bucket: 'pdf-upload-bucket-mypharma', // Your bucket name
    region: 'ap-south-1',
  },
  API: {
    REST: {
      pdfProcessor: {
        endpoint: "https://inordedh6h.execute-api.ap-south-1.amazonaws.com/Prod/start",
        region: "ap-south-1"
      },
      stepFunctions: {
        endpoint: "https://zo1cswzvkg.execute-api.ap-south-1.amazonaws.com/prod",
        region: "ap-south-1"
      }
    }
  }
});

export default Amplify;