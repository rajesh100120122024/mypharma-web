import React from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  CircularProgress,
} from '@mui/material';

// Front-end calls the API directly; be sure CORS is enabled on the gateway.
const API_URL =
  'https://n2n47v34cd.execute-api.ap-south-1.amazonaws.com/test/test';

function PostDischargeAssistant() {
  const [files, setFiles] = React.useState([]);
  const [question, setQuestion] = React.useState('');
  const [answer, setAnswer] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [fileUploaded, setFileUploaded] = React.useState(false);

  /* ─────────────────────────────  Upload flow  ─────────────────────────── */

  const handleFileSelect = (e) => {
    setFiles(Array.from(e.target.files));
  };

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

        const payload = {
          action: 'upload',
          fileName: file.name,
          fileBase64: base64String,
        };

        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        console.log('Upload response:', result);

        if (!response.ok) {
          throw new Error(`Upload failed: ${result.error || 'Unknown error'}`);
        }
      }

      setFileUploaded(true);
      alert('Files uploaded and processed successfully!');
    } catch (err) {
      console.error('Upload error:', err);
      alert(`Error uploading files: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────  Query flow  ──────────────────────────── */

  const handleAskQuestion = async () => {
    if (!question.trim()) {
      return alert('Please enter a question.');
    }
    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query', question: question.trim() }),
      });

      const data = await response.json();
      console.log('Query response:', data);

      if (!response.ok) {
        // Even error payloads are double-wrapped
        const inner = data.body ? JSON.parse(data.body) : {};
        throw new Error(inner.error || data.error || 'Unknown error');
      }

      /* ── 🔑 UNWRAP the real payload (API Gateway proxy adds one layer) ── */
      let answerText = data.answer;
      if (typeof answerText === 'undefined' && typeof data.body === 'string') {
        try {
          const inner = JSON.parse(data.body);
          answerText = inner.answer;
        } catch (e) {
          console.warn('Could not parse inner body:', e);
        }
      }
      setAnswer(answerText || '');
    } catch (err) {
      console.error('Query error:', err);
      alert(`Error asking question: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  /* ───────────────────────────────  Render  ────────────────────────────── */

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        Post-Discharge Care Assistant
      </Typography>

      {/* Upload section */}
      <Box sx={{ my: 2 }}>
        <Typography variant="subtitle1">Upload Discharge Summaries</Typography>
        <input
          type="file"
          accept=".pdf,.txt,.png,.jpg,.jpeg"
          multiple
          onChange={handleFileSelect}
        />
        {files.length > 0 && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            Selected files:&nbsp;
            {files.map((f) => f.name).join(', ')}
          </Typography>
        )}
        <Button
          variant="contained"
          sx={{ mt: 1, display: 'block' }}
          onClick={handleFileUpload}
          disabled={loading || files.length === 0}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            `Upload ${files.length} File(s)`
          )}
        </Button>
      </Box>

      {/* Question section */}
      {fileUploaded && (
        <Box sx={{ my: 2 }}>
          <TextField
            label="Ask a question about your discharge summary"
            fullWidth
            multiline
            rows={2}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g., What medications should I take?"
          />
          <Button
            variant="contained"
            sx={{ mt: 1 }}
            onClick={handleAskQuestion}
            disabled={loading || !question.trim()}
          >
            {loading ? <CircularProgress size={24} /> : 'Ask Question'}
          </Button>
        </Box>
      )}

      {/* Answer display */}
      {answer && (
        <Box
          sx={{
            my: 2,
            p: 2,
            bgcolor: '#e8f5e8',
            borderRadius: 1,
            border: '1px solid #c8e6c9',
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 'bold', color: '#2e7d32' }}
          >
            Answer:
          </Typography>
          <Typography sx={{ mt: 1 }}>{answer}</Typography>
        </Box>
      )}

      {/* Debug info (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <Box sx={{ mt: 4, p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="subtitle2">Debug Info:</Typography>
          <Typography variant="body2">
            Files selected: {files.length}
          </Typography>
          <Typography variant="body2">
            File uploaded: {fileUploaded ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="body2">
            Loading: {loading ? 'Yes' : 'No'}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default PostDischargeAssistant;
