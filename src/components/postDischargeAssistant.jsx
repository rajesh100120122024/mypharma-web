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

  // ✅ Upload handler
  const handleFileUpload = async () => {
    if (files.length === 0) return alert('Please select at least one file to upload.');
    setLoading(true);

    for (const file of files) {
      // 1️⃣ Get presigned URL for each file
      const presignedRes = await fetch('/api-server/getPresignedUrl.js', {
        method: 'POST',
        body: JSON.stringify({
          fileName: file.name,
          bucket: 'pdf-upload-bucket-mypharma',
          keyPrefix: 'uploadDischargeDocuments/user1/',
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      const { url, key } = await presignedRes.json();

      // 2️⃣ Upload file to S3
      await fetch(url, {
        method: 'PUT',
        body: file,
      });

      // 3️⃣ Tell backend to process uploaded file (create embeddings)
      await fetch('/api/postDischargeAssistant', {
        method: 'POST',
        body: JSON.stringify({
          action: 'upload',
          bucket: 'pdf-upload-bucket-mypharma',
          key: key,
        }),
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4️⃣ Show success
    setLoading(false);
    setFileUploaded(true);
    alert('Files uploaded and processed successfully! You can now ask questions.');
  };

  // ✅ Question handler
  const handleAskQuestion = async () => {
    if (!question) return;
    setLoading(true);

    const response = await fetch('/api/postDischargeAssistant', {
      method: 'POST',
      body: JSON.stringify({
        action: 'query',
        question: question,
      }),
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
