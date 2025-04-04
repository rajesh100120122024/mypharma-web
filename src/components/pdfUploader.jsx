// PdfUploader.jsx - Stylish PDF to Excel uploader for MyPharma

import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Input,
  CircularProgress,
  Stack,
  CloudUpload,
  Download
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

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);

    const formData = new FormData();
    formData.append('pdf', file);

    try {
      const response = await axios.post('http://localhost:3000/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      setDownloadLink(url);
    } catch (error) {
      alert('⚠️ Upload failed');
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
          <Input type="file" onChange={handleFileChange} fullWidth sx={{ bgcolor: 'white', p: 1 }} />

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
