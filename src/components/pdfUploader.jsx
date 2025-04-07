// PdfUploader.jsx - Updated for base64 JSON upload (Lambda compatible)

import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Input,
  CircularProgress,
  Stack
} from '@mui/material';
import axios from 'axios';
import { CloudUpload as UploadIcon, Download as DownloadIcon } from '@mui/icons-material';

function PdfUploader() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setDownloadLink(null);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]); // remove base64 prefix
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    try {
      const base64 = await fileToBase64(file);
      console.log("📤 Sending base64 JSON to Lambda...");


      const response = await axios.post(
        'https://bd1u0nv3fj.execute-api.ap-south-1.amazonaws.com/prod/upload',
        JSON.stringify({ pdf: base64 }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
          responseType: 'blob',
        }
      );
      console.log("✅ Received response:", response);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setDownloadLink(url);
    } catch (error) {
      console.error("❌ Upload failed:", error);
      alert('⚠️ Upload failed. Check browser console for details.');
      console.error('Lambda Error:', error);
    }

    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 2 }}>
      <Typography variant="h5" color="secondary" gutterBottom>
        📄 Upload Prescription PDF
      </Typography>

      <Paper elevation={4} sx={{ p: 3, bgcolor: '#fff3e0' }}>
        <Stack spacing={2}>
          <Input
            type="file"
            onChange={handleFileChange}
            fullWidth
            sx={{ bgcolor: 'white', p: 1 }}
          />

          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            disabled={!file || loading}
            onClick={handleUpload}
            color="secondary"
          >
            {loading ? <CircularProgress size={20} /> : 'Upload & Convert'}
          </Button>

          {downloadLink && (
            <Button
              variant="outlined"
              color="primary"
              startIcon={<DownloadIcon />}
              href={downloadLink}
              download="output.xlsx"
            >
              📥 Download Excel
            </Button>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}

export default PdfUploader;
