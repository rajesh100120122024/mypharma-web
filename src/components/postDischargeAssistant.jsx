import React from 'react';
import { Box, Typography, Button, TextField, CircularProgress } from '@mui/material';

function PostDischargeAssistant() {
  const [files, setFiles] = React.useState([]); // ✅ Array for multiple files
  const [question, setQuestion] = React.useState('');
  const [answer, setAnswer] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [fileUploaded, setFileUploaded] = React.useState(false);

  // ✅ File selection handler
  const handleFileSelect = (e) => {
    setFiles(Array.from(e.target.files)); // convert FileList to array
  };

  // ✅ Upload handler - send files directly to Lambda API
  const handleFileUpload = async () => {
    if (files.length === 0) return alert('Please select at least one file to upload.');
    setLoading(true);

    try {
      for (const file of files) {
        // ✅ Read file as ArrayBuffer and convert to base64
        const arrayBuffer = await file.arrayBuffer();
        const base64String = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        // ✅ Send file to Lambda API (no presigned URL)
        await fetch('https://07w4hdreje.execute-api.ap-south-1.amazonaws.com/DEV', {
          method: 'POST',
          headers: {
            'Content-Type': file.type, // e.g., application/pdf
            'file-name': file.name,
          },
          body: base64String,
        });
      }

      setFileUploaded(true);
      alert('Files uploaded and processed successfully! You can now ask questions.');
    } catch (err) {
      console.error(err);
      alert('Error uploading files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Question handler
  const handleAskQuestion = async () => {
    if (!question) return;
    setLoading(true);

    try {
      const response = await fetch('https://07w4hdreje.execute-api.ap-south-1.amazonaws.com/DEV', {
        method: 'POST',
        body: JSON.stringify({
          action: 'query',
          question: question,
        }),
        headers: { 'Content-Type': 'application/json' },
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
    <Box>
      <Typography variant="h5" gutterBottom>
        Post-Discharge Care Assistant
      </Typography>

      {/* ✅ File Upload */}
      <Box sx={{ my: 2 }}>
        <Typography variant="subtitle1">Upload Discharge Summaries</Typography>
        <input
          type="file"
          accept=".pdf,.txt"
          multiple
          onChange={handleFileSelect}
        />
        <Button
          variant="contained"
          sx={{ mt: 1 }}
          onClick={handleFileUpload}
          disabled={loading || files.length === 0}
        >
          {loading ? <CircularProgress size={24} /> : 'Upload'}
        </Button>
      </Box>

      {/* ✅ Ask Questions only if file is uploaded */}
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

      {/* ✅ Answer Display */}
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
