import React, { useState } from 'react';
import { Box, Typography, List, ListItem, ListItemText } from '@mui/material';
import PdfUploader from './components/pdfUploader';
import ChatBox from './components/chatBox';
import UpdatePatientData from './components/updatePatientData';

function App() {
  const [selectedTab, setSelectedTab] = useState('PDF Uploader');

  const renderContent = () => {
    switch (selectedTab) {
      case 'PDF Uploader':
        return <PdfUploader />;
      case 'Chat with Assistant':
        return <ChatBox />;
      case 'UpdatePatientData':
        return <UpdatePatientData />;
        
      case 'Settings':
        return <Typography variant="h6">⚙️ Settings - Coming soon!</Typography>;
      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        m: 2,
        border: '2px solid black', // ✅ Add outer border
        borderRadius: 2,
        overflow: 'hidden',
        height: 'calc(100vh - 32px)',
      }}
    >
      <Box sx={{ display: 'flex', height: '100%', bgcolor: '#f5faff' }}>
        {/* Sidebar */}
        <Box
          sx={{
            width: 240,
            bgcolor: '#0d47a1',
            color: '#fff',
            p: 2,
            boxShadow: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <Box sx={{ width: 20, height: 4, bgcolor: '#fff', borderRadius: 1 }} />
              <Box sx={{ width: 20, height: 4, bgcolor: '#fff', borderRadius: 1 }} />
              <Box sx={{ width: 20, height: 4, bgcolor: '#fff', borderRadius: 1 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
              Health Stack
            </Typography>
          </Box>

          <List>
            {['PDF Uploader', 'Chat with Assistant', 'UpdatePatientData', 'Settings'].map((text) => (
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
                  },
                }}
              >
                <ListItemText primary={text} />
              </ListItem>
            ))}
          </List>
        </Box>

        {/* Main Content */}
        <Box sx={{ flexGrow: 1, p: 4 }}>{renderContent()}</Box>
      </Box>
    </Box>
  );
}

export default App;
