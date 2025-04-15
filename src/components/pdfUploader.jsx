import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Input,
  Alert,
  Snackbar
} from '@mui/material';
import { CloudUpload, Download, ErrorOutline } from '@mui/icons-material';
import { post, get } from 'aws-amplify/api';
import { uploadData } from 'aws-amplify/storage';
import '../amplify'; // Your Amplify configuration

function PdfUploader() {
  // State management with more granular error tracking
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  // Enhanced file change handler
  const handleFileChange = useCallback((event) => {
    const selectedFile = event.target.files[0];
    
    // Validate file type and size
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        setOpenSnackbar(true);
        return;
      }

      // Optional: Add file size limit (e.g., 50MB)
      const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
      if (selectedFile.size > MAX_FILE_SIZE) {
        setError('File is too large. Maximum size is 50MB');
        setOpenSnackbar(true);
        return;
      }

      setFile(selectedFile);
      setDownloadLink(null);
      setUploaded(false);
      setError(null);
      setProgress(0);
    }
  }, []);

  // Robust execution ARN retrieval
  const waitForExecutionArn = async (postOptions, maxRetries = 20, delay = 10000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.group(`📡 Execution ARN Retrieval - Attempt ${attempt}`);
        console.log('API Call Options:', JSON.stringify(postOptions, null, 2));

        // Perform API call
        const lambdaResponse = await post(postOptions);
        
        console.log('Raw Lambda Response:', JSON.stringify(lambdaResponse, null, 2));

        // Comprehensive response parsing
        const parseResponse = (response) => {
          // Handle different response formats
          if (typeof response === 'string') {
            try {
              return JSON.parse(response);
            } catch {
              return { raw: response };
            }
          }
          return response;
        };

        const parsedResponse = parseResponse(lambdaResponse);
        
        // Multiple strategies to extract executionArn
        const executionArn = 
          parsedResponse?.executionArn || 
          parsedResponse?.body?.executionArn || 
          (typeof parsedResponse === 'string' 
            ? JSON.parse(parsedResponse)?.executionArn 
            : null);

        console.log('Extracted Execution ARN:', executionArn);
        console.groupEnd();

        if (executionArn) {
          return executionArn;
        }

        console.warn(`No executionArn found in attempt ${attempt}`);
      } catch (error) {
        console.error(`API Call Error (Attempt ${attempt}):`, {
          message: error.message,
          name: error.name,
          stack: error.stack,
          response: error.response
        });
        console.groupEnd();
      }

      // Wait before next retry
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    throw new Error("❌ Failed to retrieve execution ARN after multiple attempts");
  };

  // Enhanced polling for result
  const pollForResult = async (executionArn, retries = 15, interval = 10000) => {
    for (let i = 0; i < retries; i++) {
      try {
        console.group(`🕰️ Polling for Result - Attempt ${i + 1}`);
        console.log('Execution ARN:', executionArn);

        const res = await get({
          apiName: "stepFunctions",
          path: "/",
          options: {
            queryParams: { executionArn }
          }
        });

        console.log('Step Functions Response:', JSON.stringify(res, null, 2));

        const signedUrl = 
          res.body?.signedUrl || 
          (typeof res.body === 'string' ? JSON.parse(res.body)?.signedUrl : null);

        console.log('Signed URL:', signedUrl);
        console.groupEnd();

        if (signedUrl) {
          return signedUrl;
        }
      } catch (err) {
        console.error('Polling Error:', {
          message: err.message,
          name: err.name,
          stack: err.stack
        });
        console.groupEnd();
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error("❌ Step Function timed out or failed to generate result");
  };

  // Main upload handler
  const handleUpload = async () => {
    if (!file) {
      setError('Please select a PDF file');
      setOpenSnackbar(true);
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Generate unique filename
      const fileName = `uploads/${Date.now()}-${file.name}`;

      console.group('🚀 PDF Upload Process');
      console.log('File Details:', {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadPath: fileName
      });

      // S3 Upload
      await uploadData({
        key: fileName,
        data: file,
        options: {
          accessLevel: 'guest',
          contentType: 'application/pdf',
          onProgress: (progress) => {
            const percentUploaded = Math.round((progress.loaded / progress.total) * 100);
            console.log(`📤 Upload Progress: ${percentUploaded}%`);
            setProgress(percentUploaded);
          }
        }
      });

      console.log('✅ S3 Upload Complete');

      // Start Step Function
      const executionArn = await waitForExecutionArn({
        apiName: "pdfProcessor",
        path: "/start",
        options: {
          body: {
            s3Bucket: 'pdf-upload-bucket-mypharma',
            s3Key: fileName
          }
        }
      });

      console.log('🚀 Step Function Execution ARN:', executionArn);

      // Poll for result
      const signedUrl = await pollForResult(executionArn);
      
      console.log('✅ Signed URL Received:', signedUrl);
      console.groupEnd();

      setDownloadLink(signedUrl);
      setUploaded(true);
    } catch (error) {
      console.group('❌ Upload Error');
      console.error('Detailed Error:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      console.groupEnd();

      setError(`Upload failed: ${error.message || 'Unknown error'}`);
      setOpenSnackbar(true);
    } finally {
      setLoading(false);
    }
  };

  // Close snackbar handler
  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setOpenSnackbar(false);
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

      {/* Enhanced Error Handling Snackbar */}
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert 
          onClose={handleCloseSnackbar}
          severity="error" 
          sx={{ width: '100%' }}
          icon={<ErrorOutline />}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default PdfUploader;