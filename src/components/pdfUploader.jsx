import React, { useState, useRef } from 'react';
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
  
  // Prevent multiple simultaneous uploads
  const isUploadingRef = useRef(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    
    // File type validation
    if (selectedFile && selectedFile.type !== 'application/pdf') {
      setError('Only PDF files are allowed');
      return;
    }

    setFile(selectedFile);
    setDownloadLink(null);
    setUploaded(false);
    setError(null);
    setProgress(0);
  };

  // Polling function with extended timeout
  const pollForResult = async (executionArn, retries = 60, interval = 30000) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.group(`🕰️ Result Polling - Attempt ${i + 1}`);
        console.log(`Execution ARN: ${executionArn}`);
        console.log(`Total Wait Time: ${(i * interval / 1000 / 60).toFixed(2)} minutes`);

        const res = await get({
          apiName: "stepFunctions",
          path: "/",
          options: {
            queryParams: { executionArn }
          }
        });

        console.log("Step Functions Response:", JSON.stringify(res, null, 2));

        const signedUrl = 
          res.body?.signedUrl || 
          (typeof res.body === 'string' ? JSON.parse(res.body)?.signedUrl : null);

        if (signedUrl) {
          console.log('✅ Signed URL found after ' + 
            `${(i * interval / 1000 / 60).toFixed(2)} minutes`);
          console.groupEnd();
          return signedUrl;
        }

        console.log(`⏳ Result not ready. Waiting ${interval/1000} seconds...`);
        console.groupEnd();
      } catch (err) {
        console.error(`🔄 Polling Error (Attempt ${i + 1}):`, {
          message: err.message,
          name: err.name
        });
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error("❌ Step Function timed out after 30 minutes of waiting.");
  };

  const handleUpload = async () => {
    // Prevent multiple simultaneous uploads
    if (isUploadingRef.current || !file) return;
    
    isUploadingRef.current = true;
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      const fileName = `uploads/${Date.now()}-${file.name}`;

      // Extended timeout for S3 upload
      await uploadData({
        key: fileName,
        data: file,
        options: {
          accessLevel: 'guest',
          contentType: 'application/pdf',
          onProgress: (progress) => {
            const percentUploaded = Math.round((progress.loaded / progress.total) * 100);
            setProgress(percentUploaded);
            console.log(`📤 Upload Progress: ${percentUploaded}%`);
          }
        }
      });

      // Start Step Function
      const lambdaResponse = await post({
        apiName: "pdfProcessor",
        path: "/start",
        options: {
          body: {
            s3Bucket: 'pdf-upload-bucket-mypharma',
            s3Key: fileName
          }
        }
      });

      // Comprehensive execution ARN extraction
      const extractExecutionArn = (response) => {
        if (typeof response === 'string') {
          try {
            const parsed = JSON.parse(response);
            return parsed?.executionArn || parsed?.body?.executionArn;
          } catch {
            return null;
          }
        }
        return response?.executionArn || 
               response?.body?.executionArn || 
               (response?.body && JSON.parse(response.body)?.executionArn);
      };

      const executionArn = extractExecutionArn(lambdaResponse);

      if (!executionArn) {
        throw new Error("❌ Step Function did not return executionArn.");
      }

      // Update UI to show long-running process
      setError("Processing may take up to 3 minutes. Please wait...");

      // Poll for result with extended timeout
      const signedUrl = await pollForResult(executionArn);

      // Clear any previous error messages
      setError(null);
      setDownloadLink(signedUrl);
      setUploaded(true);
    } catch (error) {
      console.error("❌ Upload failed:", error);
      setError(`Upload failed: ${error.message || "Please try again."}`);
    } finally {
      setLoading(false);
      isUploadingRef.current = false;
    }
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