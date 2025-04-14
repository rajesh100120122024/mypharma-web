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
import axios from 'axios';
import AWS from 'aws-sdk';

function PdfUploader() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);

  // Configure AWS
  AWS.config.update({
    region: 'ap-south-1',
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'ap-south-1:fb067313-2014-4a88-94ce-63df042d5d91' // Replace with your actual Cognito Identity Pool ID
    })
  });

  const s3 = new AWS.S3();
  const BUCKET_NAME = 'pdf-upload-bucket-mypharma';  // Your actual bucket name
  const UPLOAD_PREFIX = "uploads/";  // Your folder path

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setDownloadLink(null);
    setUploaded(false);
    setError(null);
  };

  const pollForResult = async (executionArn, retries = 15, interval = 10000) => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await axios.get("https://zo1cswzvkg.execute-api.ap-south-1.amazonaws.com/prod", {
          params: { executionArn },
        });

        const base64Excel = res.data?.base64Excel;
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

  const uploadToS3 = async (file) => {
    console.log('Uploading to S3:', file.name, 'Size:', file.size);
    
    const fileKey = `${UPLOAD_PREFIX}${Date.now()}-${file.name}`;
    
    const params = {
      Bucket: BUCKET_NAME,
      Key: fileKey,
      Body: file,
      ContentType: 'application/pdf'
    };
    
    try {
      await s3.upload(params).promise();
      console.log('Successfully uploaded to S3');
      return fileKey;
    } catch (error) {
      console.error('Error uploading to S3:', error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      // Upload directly to S3
      console.log("Uploading PDF to S3");
      const s3Key = await uploadToS3(file);
      
      // Call Lambda with the S3 reference
      const response = await axios.post(
        'https://inordedh6h.execute-api.ap-south-1.amazonaws.com/Prod/start',
        { 
          s3Bucket: BUCKET_NAME,
          s3Key: s3Key
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
      const executionArn = response.data.executionArn;
      const base64Excel = await pollForResult(executionArn);
      
      // Process Excel response
      const byteCharacters = atob(base64Excel);
      const byteNumbers = Array.from(byteCharacters, (char) => char.charCodeAt(0));
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      setDownloadLink(url);
      setUploaded(true);
    } catch (error) {
      console.error("❌ Upload failed:", error);
      setError("Upload failed. " + (error.message || "Please try again."));
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