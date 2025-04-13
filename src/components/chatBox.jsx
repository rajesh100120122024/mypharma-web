import React from 'react';
import { Box, Typography, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

function ChatBox() {
  return (
    <Box>
      <Typography variant="h5" gutterBottom>MyPharma Assistant</Typography>
      <Box sx={{ height: 400, p: 2, border: '1px solid #ccc', borderRadius: 2, mb: 2 }}></Box>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField fullWidth placeholder="Type your question..." />
        <IconButton color="primary"><SendIcon /></IconButton>
      </Box>
    </Box>
  );
}

export default ChatBox;
