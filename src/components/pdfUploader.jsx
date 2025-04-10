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

  const pollForResult = async (executionArn, retries = 20, interval = 5000) => {
    for (let i = 0; i < retries; i++) {
      console.log(`🔄 Polling attempt ${i + 1}...`);
      try {
        const res = await axios.get(`https://your-api-url.com/result?executionArn=${encodeURIComponent(executionArn)}`);

        if (res.data && res.data.base64Excel) {
          console.log("✅ Excel file is ready!");
          return res.data.base64Excel;
        }
      } catch (err) {
        console.log("⏳ Still processing...");
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
      console.log("📤 Sending base64 to Lambda...");

      const response = await axios.post(
        'https://inordedh6h.execute-api.ap-south-1.amazonaws.com/Prod/start',
        { pdf: base64 },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const executionArn = response.data.executionArn;
      console.log("▶️ Step Function started:", executionArn);

      const base64Excel = await pollForResult(executionArn);

      // Convert base64 → binary → Blob
      const byteCharacters = atob(base64Excel);
      const byteNumbers = new Array(byteCharacters.length).fill().map((_, i) => byteCharacters.charCodeAt(i));
      const byteArray = new Uint8Array(byteNumbers);

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
