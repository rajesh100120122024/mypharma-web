import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
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
      reader.onload = () => resolve(reader.result.split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const pollForResult = async (executionArn, retries = 15, interval = 10000) => {
    for (let i = 0; i < retries; i++) {
      console.log(`🔄 Polling attempt ${i + 1}...`);
      const endpoint = "https://zo1cswzvkg.execute-api.ap-south-1.amazonaws.com/prod";
      try {
        const res = await axios.get(endpoint, {
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

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const response = await axios.post(
        'https://inordedh6h.execute-api.ap-south-1.amazonaws.com/Prod/start',
        { pdf: base64 },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const executionArn = response.data.executionArn;
      const base64Excel = await pollForResult(executionArn);

      const byteCharacters = atob(base64Excel);
      const byteArray = new Uint8Array([...byteCharacters].map(c => c.charCodeAt(0)));

      const blob = new Blob([byteArray], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(blob);
      setDownloadLink(url);
    } catch (error) {
      console.error("❌ Upload failed:", error);
      alert('⚠️ Upload failed. Check console for details.');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 4 }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        PDF Uploader
      </Typography>

      <Box
        sx={{
          border: '2px dashed #90caf9',
          borderRadius: '16px',
          p: 4,
          textAlign: 'center',
          mb: 3
        }}
      >
        <img
          src="https://cdn-icons-png.flaticon.com/512/724/724933.png"
          alt="Upload"
          style={{ width: 60, marginBottom: 16 }}
        />
        <Typography variant="body1" mb={2}>
          Drag and drop a PDF file here, or click to browse
        </Typography>
        <Input type="file" onChange={handleFileChange} />
      </Box>

      <Button
        variant="contained"
        onClick={handleUpload}
        disabled={!file || loading}
        startIcon={<UploadIcon />}
        sx={{
          backgroundColor: '#2e7d32',
          borderRadius: '30px',
          px: 5,
          py: 1.5,
          fontWeight: 'bold',
          boxShadow: 3,
          '&:hover': {
            backgroundColor: '#1b5e20'
          }
        }}
      >
        {loading ? <CircularProgress size={20} /> : 'UPLOAD'}
      </Button>

      {downloadLink && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            href={downloadLink}
            download="output.xlsx"
            sx={{
              borderRadius: '20px',
              px: 4,
              py: 1.2,
              color: '#00695c',
              borderColor: '#00695c',
              fontWeight: 'bold'
            }}
          >
            📥 DOWNLOAD EXCEL
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default PdfUploader;
