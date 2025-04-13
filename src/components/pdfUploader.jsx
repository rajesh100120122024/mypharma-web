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

  const pollForResult = async (executionArn, retries = 15, interval = 10000) => {
    for (let i = 0; i < retries; i++) {
      console.log(`🔄 Polling attempt ${i + 1}...`);
      const endpoint = "https://zo1cswzvkg.execute-api.ap-south-1.amazonaws.com/prod";
      console.log(encodeURIComponent(executionArn));
      try {
        const res = await axios.get(endpoint, {
          params: { executionArn },
        });
        console.log("✅ res", res);
        const base64Excel = res.data?.base64Excel;
        console.log("✅ base64Excel", base64Excel);
        if (base64Excel) {
          console.log("✅ Excel file ready");
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
    <Box sx={{ maxWidth: 650, mx: 'auto', mt: 4, p: 3, border: '1px solid #ccc', borderRadius: 3, backgroundColor: '#f9fcff' }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        PDF Uploader
      </Typography>

      <Paper variant="outlined" sx={{
        p: 2,
        textAlign: 'center',
        border: '2px dashed #90caf9',
        mb: 3,
        borderRadius: 2,
        maxWidth: '100%',
        mx: 'auto'
      }}>
        <UploadIcon sx={{ fontSize: 40, color: '#2e7d32' }} />
        <Typography variant="body1" mt={1}>
          Drag and drop a PDF file here, or click to browse
        </Typography>
        <Input
          type="file"
          onChange={handleFileChange}
          disableUnderline
          sx={{ mt: 1, fontSize: 14 }}
        />
      </Paper>

      <Box textAlign="center" mb={4}>
        <Button
          variant="contained"
          size="medium"
          sx={{
            px: 4,
            py: 1,
            bgcolor: '#2e7d32',
            fontSize: 14,
            borderRadius: 2,
            textTransform: 'uppercase'
          }}
          startIcon={<UploadIcon />}
          disabled={!file || loading}
          onClick={handleUpload}
        >
          {loading ? <CircularProgress size={20} color="inherit" /> : 'Upload'}
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
          >
            📥 Download Excel
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default PdfUploader;
