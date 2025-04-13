import React, { useState } from 'react';
import { CloudUpload as UploadIcon } from '@mui/icons-material';

function PdfUploader() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState([]);
  const [dragActive, setDragActive] = useState(false);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      setFile(droppedFile);
      processFile(droppedFile);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]); // remove base64 prefix
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const processFile = async (selectedFile) => {
    setLoading(true);

    try {
      const base64 = await fileToBase64(selectedFile);
      console.log("📤 Sending base64 to Lambda...");

      const response = await fetch(
        'https://inordedh6h.execute-api.ap-south-1.amazonaws.com/Prod/start',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ pdf: base64 })
        }
      );

      const data = await response.json();
      const executionArn = data.executionArn;
      console.log("▶️ Step Function started:", executionArn);

      // Add file to list with Processing status
      const newFile = { 
        name: selectedFile.name, 
        status: 'Processing', 
        executionArn: executionArn 
      };
      
      setFiles(prevFiles => [...prevFiles, newFile]);
      
      // Start polling
      pollForResult(executionArn, selectedFile.name);
    } catch (error) {
      console.error("❌ Upload failed:", error);
      alert('⚠️ Upload failed. Check console for details.');
      setLoading(false);
    }
  };

  const pollForResult = async (executionArn, fileName, retries = 15, interval = 10000) => {
    for (let i = 0; i < retries; i++) {
      console.log(`🔄 Polling attempt ${i + 1}...`);
      try {
        const endpoint = "https://zo1cswzvkg.execute-api.ap-south-1.amazonaws.com/prod";
        const res = await fetch(`${endpoint}?executionArn=${encodeURIComponent(executionArn)}`);
        const data = await res.json();
        
        console.log("✅ Response:", data);  
        const base64Excel = data?.base64Excel;
        
        if (base64Excel) {
          console.log("✅ Excel file ready");
          
          // Update file status to Complete
          setFiles(prevFiles => 
            prevFiles.map(file => 
              file.executionArn === executionArn 
                ? { ...file, status: 'Complete', base64Excel: base64Excel } 
                : file
            )
          );
          
          setLoading(false);
          return;
        }
      } catch (err) {
        console.log("⏳ Still processing or failed:", err.message);
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    // If we get here, processing timed out
    setFiles(prevFiles => 
      prevFiles.map(file => 
        file.executionArn === executionArn 
          ? { ...file, status: 'Failed' } 
          : file
      )
    );
    
    setLoading(false);
    console.error("❌ Step Function timed out or failed.");
  };

  const handleChatWithAssistant = (file) => {
    console.log("Chat with assistant for file:", file);
    // Add your chat navigation logic here
    // For example: router.push('/chat?fileId=' + file.executionArn);
  };

  const handleDownload = (file) => {
    if (!file.base64Excel) return;
    
    // Convert base64 → binary → Blob
    const byteCharacters = atob(file.base64Excel);
    const byteNumbers = new Array(byteCharacters.length).fill().map((_, i) => byteCharacters.charCodeAt(i));
    const byteArray = new Uint8Array(byteNumbers);

    const blob = new Blob([byteArray], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name.replace('.pdf', '.xlsx');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="flex">
      {/* Left sidebar */}
      <div className="w-1/4 bg-blue-600 text-white h-screen p-4">
        <div className="flex items-center mb-8">
          <div className="mr-2">
            <div className="w-6 h-1 bg-white mb-1"></div>
            <div className="w-6 h-1 bg-white mb-1"></div>
            <div className="w-6 h-1 bg-white"></div>
          </div>
          <h1 className="text-2xl font-bold">Health Stack</h1>
        </div>
        
        <div className="bg-white text-blue-600 rounded p-3 mb-4 flex items-center">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path>
          </svg>
          <span className="font-bold">PDF Uploader</span>
        </div>
        
        <div className="py-2 pl-2 hover:bg-blue-700 cursor-pointer">History</div>
        <div className="py-2 pl-2 hover:bg-blue-700 cursor-pointer">Downloads</div>
        <div className="py-2 pl-2 hover:bg-blue-700 cursor-pointer">Settings</div>
      </div>
      
      {/* Main content */}
      <div className="w-3/4 p-8">
        <h1 className="text-3xl font-bold mb-8">PDF Uploader</h1>
        
        {/* Upload area */}
        <div 
          className={`border-2 border-dashed rounded-lg p-8 mb-6 flex flex-col items-center justify-center text-center
            ${dragActive ? 'border-green-500 bg-green-50' : 'border-blue-200'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <div className="bg-green-500 text-white rounded-full p-3 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
            </svg>
          </div>
          
          <p className="text-lg mb-2">Drag and drop a PDF file here, or click to browse</p>
          
          <input 
            type="file" 
            accept=".pdf" 
            onChange={handleFileChange} 
            className="hidden" 
            id="file-upload" 
          />
        </div>
        
        <button 
          className="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-md w-full mb-6"
          onClick={() => document.getElementById('file-upload').click()}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Upload'}
        </button>
        
        {/* File list */}
        {files.length > 0 && (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left px-6 py-3">Filename</th>
                  <th className="text-left px-6 py-3">Status</th>
                  <th className="text-left px-6 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file, index) => (
                  <tr key={index} className="border-b">
                    <td className="px-6 py-4">{file.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-sm ${
                        file.status === 'Complete' 
                          ? 'bg-green-100 text-green-800' 
                          : file.status === 'Processing' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {file.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                        onClick={() => handleChatWithAssistant(file)}
                        disabled={file.status !== 'Complete'}
                      >
                        Chat with Assistant
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default PdfUploader;