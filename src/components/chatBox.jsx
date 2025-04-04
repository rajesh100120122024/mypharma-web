// ChatBox.jsx - Colorful chat interface for MyPharma

import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  CircularProgress,
  Avatar,
  Stack,
} from '@mui/material';
import { Send } from '@mui/icons-material';
import axios from 'axios';

function ChatBox() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { type: 'user', text: input }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:3000/chat', {
        message: input,
      });
      setMessages([...newMessages, { type: 'bot', text: response.data.reply }]);
    } catch (error) {
      setMessages([...newMessages, { type: 'bot', text: '⚠️ Something went wrong.' }]);
    }

    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', p: 2 }}>
      <Typography variant="h5" color="primary" gutterBottom>
        💬 MyPharma Assistant
      </Typography>

      <Paper elevation={4} sx={{ minHeight: 300, p: 2, mb: 2, bgcolor: '#fdfdfd' }}>
        {messages.map((msg, idx) => (
          <Stack
            key={idx}
            direction="row"
            justifyContent={msg.type === 'user' ? 'flex-end' : 'flex-start'}
            alignItems="center"
            spacing={1}
            sx={{ mb: 1 }}
          >
            {msg.type === 'bot' && <Avatar alt="Bot">🧠</Avatar>}
            <Paper
              sx={{
                p: 1.5,
                backgroundColor: msg.type === 'user' ? '#e0f7fa' : '#fce4ec',
                maxWidth: '75%',
                borderRadius: 3,
              }}
            >
              <Typography variant="body2">{msg.text}</Typography>
            </Paper>
            {msg.type === 'user' && <Avatar alt="You">🧑</Avatar>}
          </Stack>
        ))}
        {loading && <CircularProgress size={24} />}
      </Paper>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          fullWidth
          label="Type your question..."
          variant="outlined"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') handleSend();
          }}
        />
        <Button variant="contained" color="primary" onClick={handleSend} disabled={loading}>
          <Send />
        </Button>
      </Box>
    </Box>
  );
}

export default ChatBox;
