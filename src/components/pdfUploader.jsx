import React, { useState } from 'react';

const PdfUploader = () => {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(',')[1]); // remove base64 prefix
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async () => {
    if (!file) {
      setStatus('Please select a file first.');
      return;
    }

    setStatus('');
    setLoading(true);

    try {
      const base64 = await fileToBase64(file);
      const response = await fetch("https://bd1u0nv3fj.execute-api.ap-south-1.amazonaws.com/prod/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdf: base64 })
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "output.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      setStatus("✅ File processed and downloaded.");
    } catch (err) {
      console.error(err);
      setStatus("❌ Upload failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "1rem", background: "#f0f4ff", borderRadius: "12px" }}>
      <h3>📄 Upload Prescription PDF</h3>
      <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={handleUpload} disabled={!file || loading} style={{ marginTop: "1rem" }}>
        {loading ? "Processing..." : "Upload & Convert"}
      </button>
      <div style={{ marginTop: "0.5rem", color: status.startsWith("✅") ? "green" : "red" }}>{status}</div>
    </div>
  );
};

export default PdfUploader;
