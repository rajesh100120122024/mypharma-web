import React, { useState } from 'react';
import { Box, Typography, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

const SYSTEM_PROMPT = 
  "You are a HIPAA-compliant medical assistant. " +
  "Answer each question concisely in bullet points";
export default function ChatBox() {
  const [messages, setMessages] = useState([
    { role: 'system', content: SYSTEM_PROMPT }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    // 1. Add user message to state
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // 2. Call your backend
    try {
      const res = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          history: [...messages, userMsg]       // include system + prior turns
        }),
      });
      const { answer } = await res.json();

      // 3. Add assistant message to state
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      console.error(err);
      // Optionally add an error message here
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>MyPharma Assistant</Typography>

      {/* Message history */}
      <Box 
        sx={{ 
          height: 400, p: 2, border: '1px solid #ccc', borderRadius: 2, mb: 2, 
          overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 
        }}
      >
        {messages
          .filter(m => m.role !== 'system')          /* hide system in UI */
          .map((m, i) => (
            <Box 
              key={i} 
              sx={{ 
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                bgcolor: m.role === 'user' ? '#e0f7fa' : '#f1f1f1',
                p:1, borderRadius:1, maxWidth:'80%'
              }}
            >
              {m.content.split('\n').map((line, idx) => (
                <Typography key={idx} variant="body2">{line}</Typography>
              ))}
            </Box>
          ))
        }
      </Box>

      {/* Input bar */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          placeholder="Type your question..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          disabled={loading}
        />
        <IconButton
          color="primary"
          onClick={sendMessage}
          disabled={loading}
        >
          <SendIcon />
        </IconButton>
      </Box>
    </Box>
  );
}
