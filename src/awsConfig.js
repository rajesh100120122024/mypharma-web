// src/awsConfig.js
import { S3Client } from "@aws-sdk/client-s3";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";

// Custom middleware to disable checksum validation in browsers
const disableChecksumMiddleware = (config) => (next, context) => async (args) => {
  delete args.request.headers["x-amz-content-sha256"]; // remove header that triggers checksum
  return next(args);
};

export const REGION = "ap-south-1";
export const BUCKET = "pdf-upload-bucket-mypharma";
export const IDENTITY_POOL_ID = "ap-south-1:9886cb04-dc64-4bf9-b99d-9c23e36ab016"; // your Cognito ID

export const s3 = new S3Client({
  region: REGION,
  credentials: fromCognitoIdentityPool({
    identityPoolId: IDENTITY_POOL_ID,
    clientConfig: { region: REGION }
  }),
});

// 🧠 Attach custom middleware after S3Client is created
s3.middlewareStack.addRelativeTo(disableChecksumMiddleware(), {
  relation: "after",
  toMiddleware: "contentLengthMiddleware",
});
