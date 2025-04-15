import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Input,
  Alert
} from '@mui/material';
import { CloudUpload, Download } from '@mui/icons-material';
import { post, get } from 'aws-amplify/api';
import { uploadData } from 'aws-amplify/storage';
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

  const extractExecutionArn = async (postOptions) => {
    const raw = await post(postOptions);

    console.log("📬 Lambda raw response:", raw);

    let parsed;
    try {
      if (typeof raw === 'string') {
        parsed = JSON.parse(raw);
      } else if (raw?.body) {
        parsed = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw.body;
      } else {
        parsed = raw;
      }
    } catch (e) {
      console.error("❌ Failed to parse Lambda response:", e);
      throw new Error("Invalid Lambda response format");
    }

    const executionArn = parsed?.executionArn;
    console.log("🧪 Final executionArn:", executionArn);

    if (!executionArn) {
      throw new Error("❌ Step Function did not return executionArn.");
    }

    return executionArn;
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

        const signedUrl = res.body?.signedUrl || JSON.parse(res.body)?.signedUrl;
        if (signedUrl) {
          return signedUrl;
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
      const fileName = `uploads/${Date.now()}-${file.name}`;

      await uploadData({
        key: fileName,
        data: file,
        options: {
          accessLevel: 'guest',
          contentType: 'application/pdf',
          checksumAlgorithm: undefined,
          onProgress: (progressEvent) => {
            const transferred = progressEvent.transferredBytes || progressEvent.loaded;
            const total = progressEvent.totalBytes || progressEvent.total;

            if (total) {
              const percentUploaded = Math.round((transferred / total) * 100);
              setProgress(percentUploaded);
              console.log(`📤 Upload progress: ${percentUploaded}%`);
            } else {
              console.log("📤 Progress missing total size:", progressEvent);
            }
          }
        }
      });

      console.log("✅ Upload complete. Starting Step Function...");

      const executionArn = await extractExecutionArn({
        apiName: "pdfProcessor",
        path: "/start",
        options: {
          body: {
            s3Bucket: 'pdf-upload-bucket-mypharma',
            s3Key: fileName
          }
        }
      });

      const signedUrl = await pollForResult(executionArn);
      console.log("✅ Received signed URL:", signedUrl);

      setDownloadLink(signedUrl);
      setUploaded(true);
    } catch (error) {
      console.error("❌ Upload failed:", error);
      setError("Upload failed: " + (error.message || "Please try again."));
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
            target="_blank"
            rel="noopener noreferrer"
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
