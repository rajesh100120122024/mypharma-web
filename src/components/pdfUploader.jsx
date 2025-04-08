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
          responseType: 'text', // 🔄 important: we expect base64 string, not blob!
        }
      );
  
      console.log("✅ Received base64 string from Lambda:", response.data);
  
      // Convert base64 → binary → Blob
      const byteCharacters = atob(response.data); // decode base64
      const byteNumbers = new Array(byteCharacters.length).fill().map((_, i) => byteCharacters.charCodeAt(i));
      const byteArray = new Uint8Array(byteNumbers);
  
      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
  
      const url = window.URL.createObjectURL(blob);
      setDownloadLink(url);
    } catch (error) {
      console.error("❌ Upload failed:", error);
      alert('⚠️ Upload failed. Check browser console for details.');
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
