import React from 'react';
import { Box, Typography, Button, TextField, CircularProgress } from '@mui/material';

function PostDischargeAssistant() {
  const [file, setFile] = React.useState(null);
  const [question, setQuestion] = React.useState('');
  const [answer, setAnswer] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  // ✅ Upload handler
  const handleFileUpload = (e) => {
    setFile(e.target.files[0]);
  };

  // ✅ Question handler
  const handleAskQuestion = async () => {
    if (!question) return;
    setLoading(true);

    // TODO: call your backend API (or Vercel serverless function) to get the answer
    const response = await fetch('/api/postDischargeAssistant', {
      method: 'POST',
      body: JSON.stringify({ question }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await response.json();
    setAnswer(data.answer);
    setLoading(false);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Post-Discharge Care Assistant
      </Typography>

      {/* ✅ File Upload */}
      <Box sx={{ my: 2 }}>
        <Typography variant="subtitle1">Upload Discharge Summary</Typography>
        <input type="file" accept=".pdf,.txt" onChange={handleFileUpload} />
      </Box>

      {/* ✅ Question Box */}
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
