import React from 'react';
import { Box, Typography, Button, TextField, CircularProgress } from '@mui/material';

function PostDischargeAssistant() {
  const [file, setFile] = React.useState(null);
  const [question, setQuestion] = React.useState('');
  const [answer, setAnswer] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [fileUploaded, setFileUploaded] = React.useState(false);

  // ✅ Upload handler
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (!selectedFile) return;

    // 1️⃣ Get a presigned URL from your backend
    const presignedRes = await fetch('/api/getPresignedUrl', {
      method: 'POST',
      body: JSON.stringify({
        fileName: selectedFile.name,
        bucket: 'pdf-upload-bucket-mypharma',
        keyPrefix: 'uploadDischargeDocuments/user1/',
      }),
      headers: { 'Content-Type': 'application/json' },
    });
    const { url, key } = await presignedRes.json();

    // 2️⃣ Upload the file to S3 using the presigned URL
    await fetch(url, {
      method: 'PUT',
      body: selectedFile,
    });

    // 3️⃣ Tell backend to process the file (store embeddings)
    await fetch('/api/postDischargeAssistant', {
      method: 'POST',
      body: JSON.stringify({
        action: 'upload',
        bucket: 'pdf-upload-bucket-mypharma',
        key: key,
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    // 4️⃣ Show success message
    setFileUploaded(true);
    alert('File uploaded and processed successfully! You can now ask questions.');
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
        <Typography variant="subtitle1">Upload Discharge Summary</Typography>
        <input type="file" accept=".pdf,.txt" onChange={handleFileUpload} />
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
