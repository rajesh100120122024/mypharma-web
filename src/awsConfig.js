// src/awsConfig.js
import { S3Client } from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

// ✅ Remove flexible checksums middleware for browser compatibility
const removeChecksumMiddleware = (client) => {
  client.middlewareStack.remove("flexibleChecksumsMiddleware");
};

export const REGION = "ap-south-1";
export const BUCKET = "pdf-upload-bucket-mypharma";
export const IDENTITY_POOL_ID = "ap-south-1:9886cb04-dc64-4bf9-b99d-9c23e36ab016";

export const s3 = new S3Client({
  region: REGION,
  credentials: fromCognitoIdentityPool({
    identityPoolId: IDENTITY_POOL_ID,
    clientConfig: { region: REGION }
  }),
  forcePathStyle: false,
  useAccelerateEndpoint: false
});

// ✅ Remove checksum middleware (💥 this is the key fix!)
removeChecksumMiddleware(s3);
