// /api-server/getPresignedUrl.js
import express from 'express';
import AWS from 'aws-sdk';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const port = 3001;
// ? Body parsing for JSON
app.use(express.json());
const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  accessKey: process.env.AWS_ACCESS_KEY,
  signatureVersion: 'v4',
});

app.post('/get-presigned-url', async (req, res) => {
  const { fileName, keyPrefix } = req.body;

  if (!fileName || !keyPrefix) {
    return res.status(400).json({ error: 'Missing fileName or keyPrefix' });
  }

  const key = `${keyPrefix}${fileName}`;

const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: key,
    Expires: 60 * 5, // Presigned URL valid for 5 min
    ContentType: 'application/octet-stream', // Accept any file type
  };

  try {
    const uploadUrl = await s3.getSignedUrlPromise('putObject', params);
    res.json({ url: uploadUrl, key });
  } catch (err) {
    console.error('Error generating pre-signed URL:', err);
    res.status(500).json({ error: 'Error generating pre-signed URL' });
  }
});

app.listen(port, () => {
  console.log(`Presigned URL server running at http://localhost:${port}`);
});
