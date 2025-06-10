import React from 'react';
import { Box, Typography, Button, TextField, CircularProgress } from '@mui/material';

// Frontend calls the API directly; ensure CORS is enabled on the gateway
const API_URL = 'https://n2n47v34cd.execute-api.ap-south-1.amazonaws.com/test/test';

function PostDischargeAssistant() {
  const [files, setFiles] = React.useState([]);
  const [question, setQuestion] = React.useState('');
  const [answer, setAnswer] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [fileUploaded, setFileUploaded] = React.useState(false);

  // Handle file selection
  const handleFileSelect = (e) => {
    setFiles(Array.from(e.target.files));
  };

  // Upload each file as a JSON payload with base64 data and filename
  const handleFileUpload = async () => {
    if (files.length === 0) {
      return alert('Please select at least one file.');
    }
    setLoading(true);

    try {
      for (const file of files) {
        const base64String = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const [, b64] = reader.result.split(',');
            resolve(b64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64String,
            fileName: file.name,
          }),
        });
      }

      setFileUploaded(true);
      alert('Files uploaded and processed successfully!');
    } catch (err) {
      console.error(err);
      alert('Error uploading files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Ask a question once upload is done
  const handleAskQuestion = async () => {
    if (!question) return;
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query', question }),
      });
      const data = await response.json();
      setAnswer(data.answer);
    } catch (err) {
      console.error(err);
      alert('Error asking question. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Post-Discharge Care Assistant
      </Typography>

      {/* File Upload Section */}
      <Box sx={{ my: 2 }}>
        <Typography variant="subtitle1">Upload Discharge Summaries</Typography>
        <input type="file" accept=".pdf,.txt" multiple onChange={handleFileSelect} />
        <Button
          variant="contained"
          sx={{ mt: 1 }}
          onClick={handleFileUpload}
          disabled={loading || files.length === 0}
        >
          {loading ? <CircularProgress size={24} /> : 'Upload'}
        </Button>
      </Box>

      {/* Question Section (shown after upload) */}
      {fileUploaded && (
        <Box sx={{ my: 2 }}>
          <TextField
            label="Ask a question"
            fullWidth
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <Button
            variant="contained"
            sx={{ mt: 1 }}
            onClick={handleAskQuestion}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Ask'}
          </Button>
        </Box>
      )}

      {/* Answer Display */}
      {answer && (
        <Box sx={{ my: 2, p: 2, bgcolor: '#e0f7fa', borderRadius: 1 }}>
          <Typography variant="subtitle1">Answer:</Typography>
          <Typography>{answer}</Typography>
        </Box>
      )}
    </Box>
  );
}

export default PostDischargeAssistant;
