import React, { useState } from 'react';
import { Box, Button, Typography, InputLabel } from '@mui/material';
import axios from 'axios';

const UpdatePatientData = () => {
  const [mainPdf, setMainPdf] = useState(null);
  const [supportPdfs, setSupportPdfs] = useState([]);

  const handleSubmit = async () => {
    if (!mainPdf) {
      alert('Please upload the main PDF.');
      return;
    }

    const formData = new FormData();
    formData.append('mainPdf', mainPdf);

    for (let i = 0; i < supportPdfs.length; i++) {
      formData.append('supportPdfs', supportPdfs[i]);
    }

    try {
      const response = await axios.post('https://your-api-endpoint/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Uploaded successfully!');
      console.log(response.data);
    } catch (err) {
      alert('Upload failed. See console for details.');
      console.error(err);
    }
  };

  return (
    <Box
      sx={{
        backgroundColor: '#f5faff',
        borderRadius: 4,
        p: 4,
        boxShadow: 2,
        maxWidth: 500,
      }}
    >
      <Typography variant="h4" sx={{ mb: 3, color: '#0d47a1', fontWeight: 'bold' }}>
        🧬 Upload Patient Data
      </Typography>

      <Box sx={{ mb: 3 }}>
        <InputLabel sx={{ fontWeight: 'bold', color: '#333', mb: 1 }}>Main PDF Document</InputLabel>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setMainPdf(e.target.files[0])}
        />
      </Box>

      <Box sx={{ mb: 4 }}>
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
