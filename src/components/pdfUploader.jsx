import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Stack
} from '@mui/material';
import axios from 'axios';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import DownloadIcon from '@mui/icons-material/Download';

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

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const response = await axios.post(
        'https://inordedh6h.execute-api.ap-south-1.amazonaws.com/Prod/start',
        { pdf: base64 },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );
      const executionArn = response.data.executionArn;
      const base64Excel = await pollForResult(executionArn);
      const byteCharacters = atob(base64Excel);
      const byteArray = new Uint8Array([...byteCharacters].map(char => char.charCodeAt(0)));
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      setDownloadLink(url);
    } catch (error) {
      console.error("❌ Upload failed:", error);
      alert('⚠️ Upload failed. Check console for details.');
    }
    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', p: 4, border: '1px solid #ddd', borderRadius: 4, bgcolor: '#f5faff' }}>
      <Typography variant="h4" fontWeight="bold" mb={3}>
        PDF Uploader
      </Typography>

      <Paper
        elevation={0}
        sx={{
          p: 4,
          border: '2px dashed #90caf9',
          borderRadius: '12px',
          textAlign: 'center',
          mb: 3,
          bgcolor: '#fff'
        }}
      >
        <CloudUploadIcon sx={{ fontSize: 60, color: '#2e7d32', mb: 2 }} />
        <Typography variant="body1" mb={2}>
          Drag and drop a PDF file here, or click to browse
        </Typography>
        <input type="file" accept="application/pdf" onChange={handleFileChange} />
      </Paper>

      <Box textAlign="center" mb={3}>
        <Button
          variant="contained"
          color="success"
          startIcon={<CloudUploadIcon />}
          disabled={!file || loading}
          onClick={handleUpload}
          sx={{
            px: 5,
            py: 1.2,
            fontWeight: 'bold',
            borderRadius: 3,
            boxShadow: 3
          }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : 'UPLOAD'}
        </Button>
      </Box>

      {downloadLink && (
        <Box textAlign="center">
          <Button
            variant="outlined"
            color="primary"
            startIcon={<DownloadIcon />}
            href={downloadLink}
            download="output.xlsx"
            sx={{
              px: 4,
              py: 1.2,
              borderRadius: '25px',
              fontWeight: 'bold'
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
