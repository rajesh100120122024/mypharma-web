import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Stack,
  Input,
  Alert
} from '@mui/material';
import { CloudUpload, Download } from '@mui/icons-material';
import { post, get } from 'aws-amplify/api';
import { fetchAuthSession } from 'aws-amplify/auth';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import '../amplify'; // Your Amplify configuration

function PdfUploader() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setDownloadLink(null);
    setUploaded(false);
    setError(null);
    setProgress(0);
  };

  const pollForResult = async (executionArn, retries = 15, interval = 10000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await get({
          apiName: "stepFunctions",
          path: "/",
          options: {
            queryParams: { executionArn }
          }
        });

        const base64Excel = res.body?.base64Excel;
        if (base64Excel) {
          return base64Excel;
        }
      } catch (err) {
        console.log("⏳ Still processing or failed:", err.message);
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error("❌ Step Function timed out or failed.");
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      console.log("📤 Uploading PDF to S3...");
      const fileName = `uploads/${Date.now()}-${file.name}`;

      // 🔐 Get current AWS credentials from Amplify
      const session = await fetchAuthSession();
      const credentials = session.credentials;

      const s3Client = new S3Client({
        region: "ap-south-1",
        credentials: {
          accessKeyId: credentials.accessKeyId,
          secretAccessKey: credentials.secretAccessKey,
          sessionToken: credentials.sessionToken
        }
      });

      const upload = new Upload({
        client: s3Client,
        params: {
          Bucket: "pdf-upload-bucket-mypharma",
          Key: fileName,
          Body: file,
          ContentType: "application/pdf"
        }
      });

      upload.on("httpUploadProgress", (progressEvent) => {
        const percentUploaded = Math.round((progressEvent.loaded / progressEvent.total) * 100);
        setProgress(percentUploaded);
        console.log(`📶 Upload progress: ${percentUploaded}%`);
      });

      await upload.done();

      console.log("✅ Upload complete, calling Lambda...");

      const response = await post({
        apiName: "pdfProcessor",
        path: "/start",
        options: {
          body: {
            s3Bucket: 'pdf-upload-bucket-mypharma',
            s3Key: fileName
          }
        }
      });

      const executionArn = response.body.executionArn;
      console.log("🚀 Step function execution started:", executionArn);

      const base64Excel = await pollForResult(executionArn);

      const byteCharacters = atob(base64Excel);
      const byteNumbers = Array.from(byteCharacters, (char) => char.charCodeAt(0));
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      setDownloadLink(url);
      setUploaded(true);

    } catch (err) {
      console.error("❌ Upload failed:", err);
      setError("Upload failed: " + (err.message || "Please try again."));
    }

    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3, borderRadius: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2, fontSize: '1.6rem' }}>
        PDF Uploader
      </Typography>

      <Paper elevation={3} sx={{
        p: 4,
        mb: 4,
        textAlign: 'center',
        border: '2px dashed #90caf9',
        borderRadius: 3,
        bgcolor: '#f7fbff'
      }}>
        <CloudUpload sx={{ fontSize: 48, color: '#2e7d32', mb: 1 }} />
        <Typography variant="subtitle1" mb={2}>
          Drag and drop a PDF file here, or click to browse
        </Typography>

        {file && (
          <Typography variant="body2" color="text.secondary" mb={1}>
            File: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
          </Typography>
        )}

        <Input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          sx={{ mb: 2 }}
          inputProps={{ 'aria-label': 'Upload PDF' }}
        />

        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={handleUpload}
          disabled={!file || loading}
          sx={{
            bgcolor: '#2e7d32',
            borderRadius: '30px',
            px: 4,
            py: 1.2,
            mt: 1,
            fontWeight: 'bold',
            '&:hover': {
              bgcolor: '#1b5e20'
            }
          }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : "UPLOAD"}
        </Button>

        {loading && progress > 0 && (
          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Upload progress: {progress}%
            </Typography>
            <Box
              sx={{
                height: 10,
                bgcolor: '#e0e0e0',
                borderRadius: 5,
                mt: 1,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  bgcolor: '#2e7d32',
                  width: `${progress}%`,
                  transition: 'width 0.3s ease'
                }}
              />
            </Box>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {uploaded && (
        <Box sx={{ textAlign: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<Download />}
            href={downloadLink}
            download="output.xlsx"
            sx={{
              borderRadius: '24px',
              fontWeight: 'bold',
              px: 4,
              py: 1.5,
              fontSize: '1rem',
              borderColor: '#00796b',
              color: '#00796b',
              '&:hover': {
                bgcolor: '#e0f2f1'
              }
            }}
          >
            DOWNLOAD EXCEL
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default PdfUploader;
