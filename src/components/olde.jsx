import React, { useState } from 'react';
import {
  Box, Button, Typography, Paper, Stack, Input, CircularProgress
} from '@mui/material';
import { CloudUpload as UploadIcon } from '@mui/icons-material';
import axios from 'axios';

function PdfUploader() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    try {
      const base64 = await fileToBase64(file);
      console.log("📤 Sending base64 to Lambda...");

      // Call your Lambda-triggering API Gateway endpoint
      const response = await axios.post(
        'https://inordedh6h.execute-api.ap-south-1.amazonaws.com/Prod/start',
        { pdf: base64 },
        { headers: { 'Content-Type': 'application/json' } }
      );

      console.log("✅ Lambda triggered:", response.data);
      alert("Upload successful! Processing has started.");
    } catch (error) {
      console.error("❌ Upload failed:", error);
      alert("⚠️ Upload failed. See console for details.");
    }

    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>PDF Uploader</Typography>

      <Paper elevation={4} sx={{ p: 3, bgcolor: '#f5f5f5' }}>
        <Stack spacing={2} alignItems="center">
          <Input
            type="file"
            onChange={handleFileChange}
            accept="application/pdf"
            fullWidth
          />

          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            disabled={!file || loading}
            onClick={handleUpload}
            sx={{ bgcolor: '#2e7d32', color: '#fff', px: 4 }}
          >
            {loading ? <CircularProgress size={20} /> : 'Upload'}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}

export default PdfUploader;
