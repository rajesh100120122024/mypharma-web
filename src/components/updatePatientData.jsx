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
      alert('Upload failed');
      console.error(err);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>
        🧬 Upload Patient Data
      </Typography>

      <Box sx={{ mb: 2 }}>
        <InputLabel>Main PDF Document</InputLabel>
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setMainPdf(e.target.files[0])}
        />
      </Box>

      <Box sx={{ mb: 2 }}>
        <InputLabel>Supporting Documents (PDF)</InputLabel>
        <input
          type="file"
          accept="application/pdf"
          multiple
          onChange={(e) => setSupportPdfs([...e.target.files])}
        />
      </Box>

      <Button variant="contained" color="primary" onClick={handleSubmit}>
        Submit & Upload to S3
      </Button>
    </Box>
  );
};

export default UpdatePatientData;
