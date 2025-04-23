// /api-server/getPresignedUrl.js
import express from 'express';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const port = 3001;

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  accessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signatureVersion: 'v4',
});

app.get('/get-presigned-url', async (req, res) => {
  const { filename, contentType } = req.query;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `uploads/${filename}`,
    ContentType: contentType,
    Expires: 60,
  };

  try {
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    res.json({ uploadUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error generating pre-signed URL' });
  }
});

app.listen(port, () => {
  console.log(`Presigned URL server running at http://localhost:${port}`);
});
