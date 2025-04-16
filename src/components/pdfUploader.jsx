import React, { useState } from "react";
import {
  Box, Typography, Button, Paper,
  CircularProgress, Input, Alert
} from "@mui/material";
import { CloudUpload, Download } from "@mui/icons-material";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "../awsConfig";

const START_API = "https://inordedh6h.execute-api.ap-south-1.amazonaws.com/Prod/start";
// Create a proxy URL using a CORS proxy service
const CORS_PROXY = "https://corsproxy.io/?";
const GET_RESULT_API = "https://zo1cswzvkg.execute-api.ap-south-1.amazonaws.com/prod";

function PdfUploader() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadLink, setDownloadLink] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("");

  const handleFileChange = (event) => {
    const selected = event.target.files[0];
    setFile(selected);
    setDownloadLink(null);
    setUploaded(false);
    setError(null);
    setUploadProgress(0);
    setProcessingStatus("");
  };

  const uploadToS3 = async (file) => {
    const key = `uploads/${Date.now()}-${file.name}`;
    
    try {
      // Convert file to ArrayBuffer for better compatibility
      const fileArrayBuffer = await file.arrayBuffer();
      
      const params = {
        Bucket: BUCKET,
        Key: `public/${key}`,
        Body: fileArrayBuffer,
        ContentType: "application/pdf"
      };

      console.log(`Uploading file to S3: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      await s3.send(new PutObjectCommand(params));
      console.log("S3 upload completed successfully");
      return key;
    } catch (err) {
      console.error("S3 Upload Error:", err);
      throw new Error(`S3 upload failed: ${err.message}`);
    }
  };

  const triggerStepFunction = async (s3Key) => {
    try {
      console.log("Triggering Step Function with S3 key:", s3Key);
      
      // Add a small delay to ensure S3 consistency
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await fetch(START_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3Bucket: BUCKET,
          s3Key: `public/${s3Key}`
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(`API returned status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log("Step Function Response:", data);
      
      if (!data.executionArn) {
        throw new Error("No executionArn returned from API");
      }
      
      return data.executionArn;
    } catch (err) {
      console.error("Step Function Error:", err);
      throw new Error(`Failed to start processing: ${err.message}`);
    }
  };

  const pollForResult = async (executionArn, retries = 20, interval = 10000) => {
    console.log(`Starting polling for result with ARN: ${executionArn}`);
    
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Poll attempt ${i+1}/${retries}`);
        
        // FIXED AGAIN: Construct the URL differently for corsproxy.io
        // First, encode just the base API URL
        const encodedBaseUrl = encodeURIComponent(GET_RESULT_API);
        
        // Then add the executionArn as a separate parameter to the proxy URL itself
        // This is a different approach than before - params go after the encoded URL
        const proxyUrl = `${CORS_PROXY}${encodedBaseUrl}&executionArn=${encodeURIComponent(executionArn)}`;
        console.log(`Polling URL: ${proxyUrl}`);
        
        const res = await fetch(proxyUrl);
        
        if (!res.ok) {
          console.warn(`Poll attempt ${i+1}: API returned status ${res.status}`);
          setProcessingStatus(`Processing... (attempt ${i+1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        
        // Handle response data - with better error handling
        let data;
        try {
          const text = await res.text();
          console.log(`Raw response (first 100 chars): ${text.substring(0, 100)}...`);
          data = JSON.parse(text);
        } catch (parseError) {
          console.error("Failed to parse response:", parseError);
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        
        console.log(`Poll attempt ${i+1} response:`, data);
        
        if (data?.status === "RUNNING") {
          setProcessingStatus(`PDF processing in progress... (attempt ${i+1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        
        if (data?.signedUrl) {
          console.log("Received signed URL:", data.signedUrl);
          return data.signedUrl;
        }
        
        if (data?.base64Excel) {
          // If we receive base64 Excel data, create a download link
          const blob = base64ToBlob(data.base64Excel, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          const url = URL.createObjectURL(blob);
          console.log("Created blob URL from base64 data");
          console.log("Created blob URL from base64 data");
          return url;
        }
        
        if (data?.error) {
          throw new Error(`Processing error: ${data.error}`);
        }
        
        console.log(`Poll attempt ${i+1}: Still processing...`);
      } catch (err) {
        console.warn(`Poll attempt ${i+1} failed:`, err);
        
        // If we've tried 5 times with the CORS proxy and it's still failing,
        // try a different approach as fallback
        if (i === 4) {
          console.log("CORS proxy approach failed 5 times. Trying direct fetch with mode: 'no-cors'");
          try {
            // Try a direct request with no-cors mode as fallback
            // Note: This will yield an opaque response that can't be read,
            // but it might trigger the Lambda to process
            const directUrl = `${GET_RESULT_API}?executionArn=${encodeURIComponent(executionArn)}`;
            console.log(`Trying direct request to: ${directUrl}`);
            await fetch(directUrl, { mode: 'no-cors' });
            console.log("Direct request sent (no response expected due to CORS)");
          } catch (directErr) {
            console.warn("Direct request also failed:", directErr);
          }
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error("Timed out waiting for Excel result. Your file is still processing and may be available shortly.");
  };
  
  // Helper function to convert base64 to blob
  const base64ToBlob = (base64, mimeType) => {
    const byteCharacters = atob(base64);
    const byteArrays = [];
    
    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);
      
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      
      const byteArray = new Uint8Array(byteNumbers);
      byteArrays.push(byteArray);
    }
    
    return new Blob(byteArrays, { type: mimeType });
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setUploadProgress(0);
    setProcessingStatus("");

    try {
      console.log("Starting upload process for file:", file.name);
      setUploadProgress(10);
      
      const s3Key = await uploadToS3(file);
      setUploadProgress(40);
      console.log("File uploaded successfully, key:", s3Key);
      
      console.log("Triggering step function...");
      
      const executionArn = await triggerStepFunction(s3Key);
      setUploadProgress(60);
      console.log("Step function triggered, ARN:", executionArn);
      
      setProcessingStatus("Processing PDF, please wait...");
      console.log("Polling for results...");
      const signedUrl = await pollForResult(executionArn);
      setUploadProgress(100);
      console.log("Got URL for download:", signedUrl);
      
      setDownloadLink(signedUrl);
      setUploaded(true);
    } catch (err) {
      console.error("❌ Upload failed:", err);
      setError(`Upload failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Upload Medical PDF (30MB+ Supported)
      </Typography>

      <Paper elevation={3} sx={{
        p: 4, mb: 4, textAlign: "center",
        border: "2px dashed #90caf9",
        borderRadius: 3, bgcolor: "#f7fbff"
      }}>
        <CloudUpload sx={{ fontSize: 48, color: "#2e7d32", mb: 1 }} />
        <Typography variant="subtitle1" mb={2}>
          Choose or drag a PDF file (up to 100MB)
        </Typography>

        <Input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={handleUpload}
          disabled={!file || loading}
          sx={{ mb: 2 }}
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : "UPLOAD"}
        </Button>

        {loading && (
          <Box sx={{ width: '100%', mt: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              {uploadProgress < 20 ? "Preparing upload..." :
               uploadProgress < 40 ? "Uploading to storage..." : 
               uploadProgress < 60 ? "Starting conversion process..." : 
               uploadProgress < 100 ? processingStatus || "Processing PDF, please wait..." : 
               "Finalizing..."}
            </Typography>
            <Box 
              sx={{ 
                height: 8, 
                width: '100%', 
                bgcolor: '#e0e0e0',
                borderRadius: 1,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${uploadProgress}%`,
                  bgcolor: '#4caf50',
                  transition: 'width 0.3s ease'
                }}
              />
            </Box>
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        {file && !loading && !uploaded && (
          <Typography variant="body2" sx={{ mt: 2 }}>
            Ready to upload: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
          </Typography>
        )}
      </Paper>

      {uploaded && (
        <Box sx={{ textAlign: "center" }}>
          <Alert severity="success" sx={{ mb: 2 }}>
            PDF processed successfully! Your Excel file is ready for download.
          </Alert>
          <Button
            variant="outlined"
            startIcon={<Download />}
            href={downloadLink}
            download="output.xlsx"
          >
            DOWNLOAD EXCEL
          </Button>
        </Box>
      )}
    </Box>
  );
}

export default PdfUploader;