import React, { useState } from "react";
import {
  Box, Typography, Button, Paper,
  CircularProgress, Input, Alert
} from "@mui/material";
import { CloudUpload, Download } from "@mui/icons-material";

function PromptTester() {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState("gpt-4");
  const [temperature, setTemperature] = useState("default");
  const [maxTokens, setMaxTokens] = useState("default");
  const [topP, setTopP] = useState("default");
  const [frequencyPenalty, setFrequencyPenalty] = useState("default");
  const [presencePenalty, setPresencePenalty] = useState("default");
  const [response, setResponse] = useState("");
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runPrompt = async () => {
    setLoading(true);
    setResponse("");
    setInfo(null);
    setError(null);

    const payload = { prompt, model };
    if (temperature !== "default") payload.temperature = parseFloat(temperature);
    if (maxTokens !== "default") payload.max_tokens = parseInt(maxTokens);
    if (topP !== "default") payload.top_p = parseFloat(topP);
    if (frequencyPenalty !== "default") payload.frequency_penalty = parseFloat(frequencyPenalty);
    if (presencePenalty !== "default") payload.presence_penalty = parseFloat(presencePenalty);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch("https://your-backend-url.com/runPrompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(payload),
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error("Server error");

      const data = await res.json();
      setResponse(data.response);
      setInfo({ tokens: data.tokens_used, latency: data.latency });
    } catch (err) {
      setError(err.name === 'AbortError' ? "Request timed out" : err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", backgroundColor: "#f5faff" }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 4, width: "100%", maxWidth: 1000 }}>
        <Typography variant="h5" gutterBottom>🧠 Prompt Tester</Typography>

        <Typography variant="subtitle1">Enter Prompt</Typography>
        <Input
          multiline
          rows={5}
          fullWidth
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type your prompt here..."
          sx={{ mb: 2 }}
        />

        <Typography variant="subtitle1">Select Model</Typography>
        <select value={model} onChange={(e) => setModel(e.target.value)} style={{ width: "100%", padding: 10, marginBottom: 16 }}>
          <option value="gpt-4">GPT-4</option>
          <option value="claude">Claude 3 Opus</option>
          <option value="mistral">Mistral 7B (Groq)</option>
          <option value="command-r">Cohere Command R+</option>
          <option value="llama3">LLaMA 3 (OpenRouter)</option>
        </select>

        {[{
          label: "Temperature", value: temperature, setter: setTemperature,
          options: ["default", "0", "0.5", "1"]
        }, {
          label: "Max Tokens", value: maxTokens, setter: setMaxTokens,
          options: ["default", "256", "512", "1024"]
        }, {
          label: "Top P", value: topP, setter: setTopP,
          options: ["default", "0.5", "0.8", "1"]
        }, {
          label: "Frequency Penalty", value: frequencyPenalty, setter: setFrequencyPenalty,
          options: ["default", "0", "0.5", "1"]
        }, {
          label: "Presence Penalty", value: presencePenalty, setter: setPresencePenalty,
          options: ["default", "0", "0.5", "1"]
        }].map(({ label, value, setter, options }) => (
          <Box key={label} sx={{ mb: 2 }}>
            <Typography variant="subtitle1">{label}</Typography>
            <select
              value={value}
              onChange={(e) => setter(e.target.value)}
              style={{ width: "100%", padding: 10 }}
            >
              {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </Box>
        ))}

        <Button
          variant="contained"
          color="primary"
          startIcon={<CloudUpload />}
          onClick={runPrompt}
          disabled={loading}
          fullWidth
          sx={{ mt: 2 }}
        >
          {loading ? <CircularProgress size={24} /> : "Submit & Run Prompt"}
        </Button>

        {error && <Alert severity="error" sx={{ mt: 2 }}>❌ {error}</Alert>}

        {response && (
          <Paper variant="outlined" sx={{ mt: 4, p: 2 }}>
            <Typography variant="h6">🧾 Response</Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>{response}</Typography>
            <Typography variant="body2" sx={{ mt: 2 }}>⏱️ Latency: {info?.latency}s</Typography>
            <Typography variant="body2">📊 Tokens Used: {info?.tokens}</Typography>
          </Paper>
        )}
      </Paper>
    </Box>
  );
}

export default PromptTester;
