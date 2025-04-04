import React, { useState } from 'react';
import { Container, Tabs, Tab, Box } from '@mui/material';
import ChatBox from './components/chatBox';
import PdfUploader from './components/pdfUploader';

function App() {
  const [tabIndex, setTabIndex] = useState(0);

  return (
    <Container maxWidth="md" sx={{ pt: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Tabs
          value={tabIndex}
          onChange={(e, newIndex) => setTabIndex(newIndex)}
          centered
          variant="fullWidth"
        >
          <Tab label="💬 Chat with Assistant" />
          <Tab label="📄 PDF to Excel" />
        </Tabs>
      </Box>

      <Box>
        {tabIndex === 0 && <ChatBox />}
        {tabIndex === 1 && <PdfUploader />}
      </Box>
    </Container>
  );
}

export default App;
