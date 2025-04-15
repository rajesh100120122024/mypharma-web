import React, { useState } from "react";
import {
  Box, Typography, Button, Paper,
  CircularProgress, Input, Alert
} from "@mui/material";
import { CloudUpload, Download } from "@mui/icons-material";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "../awsConfig";

const START_API = "https://inordedh6h.execute-api.ap-south-1.amazonaws.com/Prod/start";
const GET_RESULT_API = "https://zo1cswzvkg.execute-api.ap-south-1.amazonaws.com/prod/get";

function PdfUploader() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadLink, setDownloadLink] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    const selected = event.target.files[0];
    setFile(selected);
    setDownloadLink(null);
    setUploaded(false);
    setError(null);
    setUploadProgress(0);
  };

  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const uploadToS3 = async (file) => {
    const key = `uploads/${Date.now()}-${file.name}`;
    
    try {
      // Convert file to ArrayBuffer using FileReader API (more compatible than file.arrayBuffer())
      const fileArrayBuffer = await readFileAsArrayBuffer(file);
      
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
      throw new Error(`S3 upload failed: ${err.message || "Unknown error"}`);
    }
  };

  const triggerStepFunction = async (s3Key) => {
    try {
      console.log("Triggering Step Function with S3 key:", s3Key);
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
      throw new Error(`Failed to start processing: ${err.message || "Unknown error"}`);
    }
  };

  const pollForResult = async (executionArn, retries = 15, interval = 10000) => {
    console.log(`Starting polling for result with ARN: ${executionArn}`);
    console.log(`Will poll ${retries} times with ${interval}ms interval`);
    
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Poll attempt ${i+1}/${retries}`);
        
        const url = `${GET_RESULT_API}?executionArn=${encodeURIComponent(executionArn)}`;
        console.log(`Polling URL: ${url}`);
        
        const res = await fetch(url);
        
        if (!res.ok) {
          console.warn(`Poll attempt ${i+1}: API returned status ${res.status}`);
          const errorText = await res.text();
          console.error("Poll Error Response:", errorText);
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        
        const data = await res.json();
        console.log(`Poll attempt ${i+1} response:`, data);
        
        if (data?.signedUrl) {
          console.log("Received signed URL:", data.signedUrl);
          return data.signedUrl;
        }
        
        console.log(`Poll attempt ${i+1}: Still processing...`);
      } catch (err) {
        console.warn(`Poll attempt ${i+1} failed:`, err);
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error("Timed out waiting for Excel result");
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setUploadProgress(0);

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
      
      console.log("Polling for results...");
      const signedUrl = await pollForResult(executionArn);
      setUploadProgress(100);
      console.log("Got signed URL for download:", signedUrl);
      
      setDownloadLink(signedUrl);
      setUploaded(true);
    } catch (err) {
      console.error("❌ Upload failed:", err);
      setError(`Upload failed: ${err.message || "Unknown error"}`);
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
              {uploadProgress < 40 ? "Uploading to storage..." : 
               uploadProgress < 60 ? "Starting conversion process..." : 
               uploadProgress < 100 ? "Processing PDF, please wait..." : 
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

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        
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