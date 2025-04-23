import React, { useState } from 'react';
import { Box, Button, Typography, InputLabel } from '@mui/material';
import axios from 'axios';

const UpdatePatientData = () => {
  const [mainPdf, setMainPdf] = useState(null);
  const [supportPdfs, setSupportPdfs] = useState([]);
  const [extraPdf, setExtraPdf] = useState(null);

  const getPresignedUrl = async (filename, contentType) => {
    const res = await axios.get('/api/get-presigned-url', {
      params: {
        filename,
        contentType,
      },
    });
    return res.data.uploadUrl;
  };

  const uploadToS3 = async (file, filename) => {
    const url = await getPresignedUrl(filename, file.type);
    await axios.put(url, file, {
      headers: {
        'Content-Type': file.type,
      },
    });
  };

  const handleSubmit = async () => {
    if (!mainPdf) {
      alert('Please upload the main PDF.');
      return;
    }

    try {
      await uploadToS3(mainPdf, `MainPdf-${Date.now()}.pdf`);

      if (supportPdfs[0]) {
        await uploadToS3(supportPdfs[0], `SupportPdf1-${Date.now()}.pdf`);
      }

      const support2 = supportPdfs[1] || extraPdf;
      if (support2) {
        await uploadToS3(support2, `SupportPdf2-${Date.now()}.pdf`);
      }

      alert('Files uploaded to S3 successfully!');
    } catch (err) {
      alert('Upload failed. Check console for details.');
      console.error(err);
    }
  };

  return (
    <Box sx={{ backgroundColor: '#f5faff', borderRadius: 4, p: 4, boxShadow: 2, maxWidth: 500 }}>
      <Typography variant="h4" sx={{ mb: 3, color: '#0d47a1', fontWeight: 'bold' }}>
        🧬 Upload Patient Data
      </Typography>

      <Box sx={{ mb: 3 }}>
        <InputLabel sx={{ fontWeight: 'bold', color: '#333', mb: 1 }}>Main PDF Document</InputLabel>
        <input type="file" accept="application/pdf" onChange={(e) => setMainPdf(e.target.files[0])} />
      </Box>

      <Box sx={{ mb: 3 }}>
        <InputLabel sx={{ fontWeight: 'bold', color: '#333', mb: 1 }}>
          Supporting Documents (PDF)
        </InputLabel>
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => setSupportPdfs([...e.target.files])}
        />
      </Box>

      <Box sx={{ mb: 4 }}>
        <InputLabel sx={{ fontWeight: 'bold', color: '#333', mb: 1 }}>
          Extra PDF Document
        </InputLabel>
        <input type="file" accept="application/pdf" onChange={(e) => setExtraPdf(e.target.files[0])} />
      </Box>

      <Button
        variant="contained"
        sx={{
          backgroundColor: '#00695c',
          borderRadius: 8,
          px: 4,
          py: 1.5,
          fontWeight: 'bold',
          fontSize: '1rem',
          '&:hover': { backgroundColor: '#004d40' },
        }}
        onClick={handleSubmit}
      >
        SUBMIT & UPLOAD TO S3
      </Button>
    </Box>
  );
};

export default UpdatePatientData;
