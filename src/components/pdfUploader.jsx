import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Input,
  Alert
} from "@mui/material";
import { CloudUpload, Download } from "@mui/icons-material";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "../awsConfig"; // ✅ Import your S3 client
const START_API = "https://inordedh6h.execute-api.ap-south-1.amazonaws.com/Prod/start";
const GET_RESULT_API = "https://zo1cswzvkg.execute-api.ap-south-1.amazonaws.com/prod/get";
function PdfUploader() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloadLink, setDownloadLink] = useState(null);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setDownloadLink(null);
    setUploaded(false);
    setError(null);
  };

  const uploadToS3 = async (file) => {
    const key = `uploads/${Date.now()}-${file.name}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `public/${key}`, // 👈 match Amplify-like path
        Body: file,
        ContentType: "application/pdf"
      })
    );

    return key;
  };

  const triggerStepFunction = async (s3Key) => {
    const response = await fetch(
      START_API, // 🔁 Replace with your API
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          s3Bucket: BUCKET,
          s3Key: `public/${s3Key}`
        })
      }
    );

    const data = await response.json();
    return data.executionArn;
  };

  const pollForResult = async (
    executionArn,
    retries = 15,
    interval = 10000
  ) => {
    for (let i = 0; i < retries; i++) {
      const res = await fetch(
        `${GET_RESULT_API}?executionArn=${encodeURIComponent(
          executionArn
        )}`
      );
      const data = await res.json();

      if (data?.signedUrl) return data.signedUrl;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error("❌ Timed out waiting for Excel result");
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      const s3Key = await uploadToS3(file);
      console.log("✅ Uploaded to S3:", s3Key);

      const executionArn = await triggerStepFunction(s3Key);
      console.log("🚀 Step Function started:", executionArn);

      const signedUrl = await pollForResult(executionArn);
      console.log("✅ Signed URL received:", signedUrl);

      setDownloadLink(signedUrl);
      setUploaded(true);
    } catch (err) {
      console.error("❌ Upload failed:", err);
      setError("Upload failed: " + err.message);
    }

    setLoading(false);
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", p: 3 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Upload Medical PDF (No Amplify)
      </Typography>

      <Paper
        elevation={3}
        sx={{
          p: 4,
          mb: 4,
          textAlign: "center",
          border: "2px dashed #90caf9",
          borderRadius: 3,
          bgcolor: "#f7fbff"
        }}
      >
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
        >
          {loading ? <CircularProgress size={22} color="inherit" /> : "UPLOAD"}
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Paper>

      {uploaded && (
        <Box sx={{ textAlign: "center" }}>
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
