import { S3Client } from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

export const REGION = "ap-south-1"; // 🛠 your AWS region
export const BUCKET = "pdf-upload-bucket-mypharma"; // 🛠 your S3 bucket
export const IDENTITY_POOL_ID = "ap-south-1:9886cb04-dc64-4bf9-b99d-9c23e36ab016"; // 🛠 replace this

export const s3 = new S3Client({
    region: REGION,
    credentials: fromCognitoIdentityPool({
      identityPoolId: IDENTITY_POOL_ID,
      clientConfig: { region: REGION }
    }),
    forcePathStyle: false,
    useAccelerateEndpoint: false,
    // ✅ disable checksum middleware in browser
    runtime: 'browser'
  });
