import React, { useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import PdfUploader from './components/pdfUploader';
import ChatBox from './components/chatBox';

function App() {
  const [selectedTab, setSelectedTab] = useState('PDF Uploader');

  const renderContent = () => {
    switch (selectedTab) {
      case 'PDF Uploader':
        return <PdfUploader />;
      case 'Chat with Assistant':
        return <ChatBox />;
      case 'Settings':
        return <Typography variant="h6">⚙️ Settings - Coming soon!</Typography>;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: '#f5faff' }}>
      
      {/* Sidebar */}
      <Box sx={{
        width: 240,
        bgcolor: '#0d47a1',
        color: '#fff',
        p: 2,
        boxShadow: 3
      }}>
        <Typography
          variant="h6"
          sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}
        >
          📘 Health Stack
        </Typography>

        <List>
          {['PDF Uploader', 'Chat with Assistant', 'Settings'].map((text) => (
            <ListItem
              button
              key={text}
              selected={selectedTab === text}
              onClick={() => setSelectedTab(text)}
              sx={{
                color: '#fff',
                '&.Mui-selected': {
                  bgcolor: '#1565c0',
                  borderRadius: '4px',
                }
              }}
            >
              <ListItemText primary={text} />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: 4 }}>
        {renderContent()}
      </Box>
    </Box>
  );
}

export default App;
