import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Input,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
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
      try {
        const res = await axios.get(endpoint, { params: { executionArn } });
        const base64Excel = res.data?.base64Excel;
        if (base64Excel) return base64Excel;
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

      const byteArray = new Uint8Array([...atob(base64Excel)].map(c => c.charCodeAt(0)));
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
    <Box sx={{ maxWidth: 800, mx: 'auto', mt: 4, border: '2px solid #ccc', borderRadius: 3, p: 4 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        PDF Uploader
      </Typography>

      <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', border: '2px dashed #90caf9', mb: 3 }}>
        <UploadIcon sx={{ fontSize: 60, color: '#2e7d32' }} />
        <Typography variant="body1" mt={2}>
          Drag and drop a PDF file here, or click to browse
        </Typography>
        <Input type="file" onChange={handleFileChange} fullWidth disableUnderline sx={{ mt: 2 }} />
      </Paper>

      <Box textAlign="center" mb={4}>
        <Button
          variant="contained"
          size="large"
          sx={{ px: 5, py: 1.5, bgcolor: '#2e7d32' }}
          startIcon={<UploadIcon />}
          disabled={!file || loading}
          onClick={handleUpload}
        >
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Upload'}
        </Button>
      </Box>

      {/* Result table */}
      <TableContainer component={Paper} elevation={1}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f0f0f0' }}>
              <TableCell><strong>Filename</strong></TableCell>
              <TableCell><strong>Status</strong></TableCell>
              <TableCell><strong>Download</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>{file?.name || 'report1.pdf'}</TableCell>
              <TableCell>
                {loading ? (
                  <Box sx={{ color: 'orange', fontWeight: 'bold' }}>Processing</Box>
                ) : downloadLink ? (
                  <Box sx={{ color: 'green', fontWeight: 'bold' }}>Complete</Box>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell>
                {downloadLink && (
                  <Button
                    variant="contained"
                    href={downloadLink}
                    download="output.xlsx"
                    sx={{ bgcolor: '#1976d2' }}
                  >
                    Download
                  </Button>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default PdfUploader;
