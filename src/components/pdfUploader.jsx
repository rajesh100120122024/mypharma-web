import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Input,
  CircularProgress,
  Stack,
  List,
  ListItem,
  ListItemText,
  Divider
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

  const pollForResult = async (executionArn, retries = 20, interval = 5000) => {
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
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Box sx={{ width: 240, bgcolor: '#1976d2', color: '#fff', p: 2 }}>
        <Typography variant="h6" gutterBottom>Health Stack</Typography>
        <List>
          <ListItem selected>
            <ListItemText primary="📤 PDF Uploader" />
          </ListItem>
          <ListItem>
            <ListItemText primary="💬 Chat with Assistant" />
          </ListItem>
          <ListItem>
            <ListItemText primary="⚙️ Settings" />
          </ListItem>
        </List>
      </Box>

      <Box sx={{ flexGrow: 1, p: 4 }}>
        <Typography variant="h5" gutterBottom>PDF Uploader</Typography>

        <Paper elevation={3} sx={{ p: 4, mb: 4, textAlign: 'center' }}>
          <Box
            sx={{
              border: '2px dashed #1976d2',
              p: 4,
              mb: 2,
              borderRadius: 2,
              bgcolor: '#f9f9f9'
            }}
          >
            <Typography>📤 Drag and drop a PDF file here, or click to browse</Typography>
          </Box>

          <Input type="file" onChange={handleFileChange} fullWidth sx={{ mb: 2 }} />
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            disabled={!file || loading}
            onClick={handleUpload}
            color="primary"
          >
            {loading ? <CircularProgress size={20} /> : 'Upload'}
          </Button>
        </Paper>

        {downloadLink && (
          <Box>
            <Typography variant="h6" gutterBottom>Downloads</Typography>
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
    </Box>
  );
}

export default PdfUploader;
