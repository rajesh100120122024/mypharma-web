import React, { useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText, Divider } from '@mui/material';
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
      default:
        return <Typography variant="h6">Coming Soon</Typography>;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* Sidebar */}
      <Box sx={{ width: 240, bgcolor: '#1976d2', color: '#fff', p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Health Stack</Typography>
        <List>
          {['PDF Uploader', 'Chat with Assistant', 'Settings'].map((text) => (
            <ListItem
              button
              key={text}
              selected={selectedTab === text}
              onClick={() => setSelectedTab(text)}
              sx={{ color: '#fff' }}
            >
              <ListItemText primary={text} />
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Main Content */}
      <Box sx={{ flexGrow: 1, p: 3 }}>
        {renderContent()}
      </Box>
    </Box>
  );
}

export default App;
