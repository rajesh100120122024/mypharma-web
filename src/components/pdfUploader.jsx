import React, { useState, useCallback, useRef } from 'react';
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
import '../amplify';

function PdfUploader() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  
  // Prevent multiple simultaneous uploads
  const isUploadingRef = useRef(false);

  const handleFileChange = useCallback((event) => {
    const selectedFile = event.target.files[0];
    
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Only PDF files are allowed');
        setOpenSnackbar(true);
        return;
      }

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

  // Enhanced logging and error handling
  const logAndHandleError = (message, errorDetails = {}) => {
    console.error('Upload Error:', {
      message,
      ...errorDetails
    });
    setError(message);
    setOpenSnackbar(true);
    isUploadingRef.current = false;
  };

  const waitForExecutionArn = async (postOptions) => {
    try {
      console.group('🚀 Step Function Execution ARN Retrieval');
      console.log('API Call Options:', JSON.stringify(postOptions, null, 2));

      // Perform API call with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const lambdaResponse = await post({
        ...postOptions,
        options: {
          ...postOptions.options,
          signal: controller.signal
        }
      });

      clearTimeout(timeoutId);

      console.log('Raw Lambda Response:', JSON.stringify(lambdaResponse, null, 2));

      // Comprehensive ARN extraction
      const extractExecutionArn = (response) => {
        // Multiple extraction strategies
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
      
      console.log('Extracted Execution ARN:', executionArn);
      console.groupEnd();

      if (!executionArn) {
        throw new Error('No execution ARN found in response');
      }

      return executionArn;
    } catch (error) {
      console.error('Execution ARN Retrieval Error:', {
        message: error.message,
        name: error.name,
        stack: error.stack
      });
      throw error;
    }
  };

  const handleUpload = async () => {
    // Prevent multiple simultaneous uploads
    if (isUploadingRef.current || !file) {
      return;
    }

    isUploadingRef.current = true;
    setLoading(true);
    setError(null);
    setProgress(0);

    try {
      // Generate unique filename
      const fileName = `uploads/${Date.now()}-${file.name}`;

      console.group('📤 PDF Upload Process');
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
            console.log(`Upload Progress: ${percentUploaded}%`);
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

      // Poll for result with improved error handling
      const signedUrl = await new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 15;

        const checkExecution = async () => {
          try {
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

            if (signedUrl) {
              resolve(signedUrl);
            } else {
              attempts++;
              if (attempts < maxAttempts) {
                setTimeout(checkExecution, 10000); // 10 seconds between attempts
              } else {
                reject(new Error('Step Function timed out'));
              }
            }
          } catch (err) {
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(checkExecution, 10000);
            } else {
              reject(err);
            }
          }
        };

        checkExecution();
      });

      console.log('✅ Signed URL Received:', signedUrl);
      console.groupEnd();

      setDownloadLink(signedUrl);
      setUploaded(true);
      isUploadingRef.current = false;
    } catch (error) {
      logAndHandleError(`Upload failed: ${error.message || 'Unknown error'}`, {
        name: error.name,
        stack: error.stack
      });
    } finally {
      setLoading(false);
      isUploadingRef.current = false;
    }
  };

  // Rest of the component remains the same as in previous version
  // ... (render method, etc.)

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3, borderRadius: 4 }}>
      {/* ... existing UI code ... */}
    </Box>
  );
}

export default PdfUploader;