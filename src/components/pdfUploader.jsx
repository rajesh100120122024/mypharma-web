import React, { useState } from "react";
import {
  Box, Typography, Button, Paper,
  CircularProgress, Input, Alert
} from "@mui/material";
import { CloudUpload, Download } from "@mui/icons-material";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "../awsConfig";

const START_API = "https://inordedh6h.execute-api.ap-south-1.amazonaws.com/Prod/start";
// We'll try a different CORS proxy that might work better
const CORS_PROXY = "https://api.allorigins.win/raw?url=";
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

      // console.log(`Uploading file to S3: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`);
      await s3.send(new PutObjectCommand(params));
      // console.log("S3 upload completed successfully");
      return key;
    } catch (err) {
      // console.error("S3 Upload Error:", err);
      throw new Error(`S3 upload failed: ${err.message}`);
    }
  };

  const triggerStepFunction = async (s3Key) => {
    try {
      // console.log("Triggering Step Function with S3 key:", s3Key);
      
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
        // console.error("API Error Response:", errorText);
        throw new Error(`API returned status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      // console.log("Step Function Response:", data);
      
      if (!data.executionArn) {
        throw new Error("No executionArn returned from API");
      }
      
      return data.executionArn;
    } catch (err) {
      // console.error("Step Function Error:", err);
      throw new Error(`Failed to start processing: ${err.message}`);
    }
  };

  const pollForResult = async (executionArn, retries = 20, interval = 10000) => {
    // console.log(`Starting polling for result with ARN: ${executionArn}`);
    
    // Store the API usage approach we're currently using
    // We'll try different approaches if one fails
    let apiApproach = "direct"; // Start with direct API call
    
    for (let i = 0; i < retries; i++) {
      try {
        // console.log(`Poll attempt ${i+1}/${retries} using ${apiApproach} approach`);
        
        let res;
        
        if (apiApproach === "direct") {
          // Try direct API call first - this might work if your API has CORS enabled
          const directUrl = `${GET_RESULT_API}?executionArn=${encodeURIComponent(executionArn)}`;
          // console.log(`Trying direct request to: ${directUrl}`);
          
          try {
            res = await fetch(directUrl, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
              }
            });
            // console.log(`Direct API call status: ${res.status}`);
          } catch (err) {
            // console.warn("Direct API call failed, likely due to CORS:", err);
            // Switch to proxy approach on next iteration
            apiApproach = "proxy";
            throw err; // Propagate error to trigger retry with new approach
          }
        } else if (apiApproach === "proxy") {
          // Try with CORS proxy
          const targetUrl = `${GET_RESULT_API}?executionArn=${encodeURIComponent(executionArn)}`;
          const proxyUrl = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
          // console.log(`Trying CORS proxy: ${proxyUrl}`);
          
          res = await fetch(proxyUrl);
          // console.log(`CORS proxy call status: ${res.status}`);
        } else if (apiApproach === "post") {
          // Try POST method as last resort
          // console.log(`Trying POST method to: ${GET_RESULT_API}`);
          
          res = await fetch(GET_RESULT_API, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ executionArn })
          });
          // console.log(`POST method call status: ${res.status}`);
        }
        
        if (!res.ok) {
          // console.warn(`Poll attempt ${i+1}: API returned status ${res.status}`);
          setProcessingStatus(`Processing... (attempt ${i+1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        
        // Handle response data - with better error handling
        let data;
        try {
          // First check if the response is valid
          if (!res.ok) {
            // console.warn(`Response not OK: ${res.status} ${res.statusText}`);
            
            // If we get a CORS error or 403/401 with direct approach, try another approach
            if (apiApproach === "direct") {
              apiApproach = "proxy";
              // console.log("Switching to proxy approach on next attempt");
            } else if (apiApproach === "proxy") {
              apiApproach = "post";
              // console.log("Switching to POST method approach on next attempt");
            }
            
            throw new Error(`HTTP error: ${res.status}`);
          }
          
          const text = await res.text();
          // console.log(`Raw response (first 100 chars): ${text.substring(0, 100)}...`);
          
          // Handle empty responses
          if (!text || text.trim() === '') {
            // console.warn("Received empty response");
            throw new Error("Empty response");
          }
          
          data = JSON.parse(text);
        } catch (parseError) {
          // console.error("Failed to parse response:", parseError);
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        
        // console.log(`Poll attempt ${i+1} response:`, data);
        
        if (data?.status === "RUNNING") {
          setProcessingStatus(`PDF processing in progress... (attempt ${i+1}/${retries})`);
          await new Promise(resolve => setTimeout(resolve, interval));
          continue;
        }
        
        if (data?.signedUrl) {
          // console.log("Received signed URL:", data.signedUrl);
          return data.signedUrl;
        }
        
        if (data?.base64Excel) {
          // If we receive base64 Excel data, create a download link
          const blob = base64ToBlob(data.base64Excel, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
          const url = URL.createObjectURL(blob);
          // console.log("Created blob URL from base64 data");
          return url;
        }
        
        if (data?.error) {
          throw new Error(`Processing error: ${data.error}`);
        }
        
        // console.log(`Poll attempt ${i+1}: Still processing...`);
      } catch (err) {
        // console.warn(`Poll attempt ${i+1} failed:`, err);
        
        // Try switching approaches if one fails
        if (apiApproach === "direct") {
          apiApproach = "proxy";
          // console.log("Switching to proxy approach after error");
        } else if (apiApproach === "proxy") {
          apiApproach = "post";
          // console.log("Switching to POST method approach after error");
        } else if (apiApproach === "post" && i >= 5) {
          // If we've tried all approaches multiple times, try a more aggressive approach
          // console.log("All approaches failed multiple times. Trying with no-cors mode");
          try {
            // This is a last resort - just try to hit the Lambda even if we can't read the response
            // It might at least trigger the processing
            const directUrl = `${GET_RESULT_API}?executionArn=${encodeURIComponent(executionArn)}`;
            await fetch(directUrl, { mode: 'no-cors' });
            // console.log("no-cors request sent (response can't be read)");
          } catch (directErr) {
            // console.warn("no-cors request also failed:", directErr);
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
      // console.log("Starting upload process for file:", file.name);
      setUploadProgress(10);
      
      const s3Key = await uploadToS3(file);
      setUploadProgress(40);
      // console.log("File uploaded successfully, key:", s3Key);
      
      // console.log("Triggering step function...");
      
      const executionArn = await triggerStepFunction(s3Key);
      setUploadProgress(60);
      // console.log("Step function triggered, ARN:", executionArn);
      
      setProcessingStatus("Processing PDF, please wait...");
      // console.log("Polling for results...");
      const signedUrl = await pollForResult(executionArn);
      setUploadProgress(100);
      // console.log("Got URL for download:", signedUrl);
      
      setDownloadLink(signedUrl);
      setUploaded(true);
    } catch (err) {
      // console.error("❌ Upload failed:", err);
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