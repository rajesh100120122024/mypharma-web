import React, { useState } from "react";
import {
  Box, Typography, Button, Paper,
  CircularProgress, Input, Alert
} from "@mui/material";
import { CloudUpload } from "@mui/icons-material";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { s3, BUCKET } from "../awsConfig";

function PromptTester() {
  const [prompt, setPrompt] = useState("");
  const [provider, setProvider] = useState("openai");
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

  const modelOptions = {
    openai: ["gpt-4", "gpt-3.5-turbo", "gpt-3.5-turbo-16k"],
    claude: ["claude-3-opus", "claude-3-sonnet"],
    mistral: ["mistral-7b", "mixtral-8x7b"],
    cohere: ["command-r", "command-r-plus"],
    meta: ["llama3-70b", "llama3-8b"]
  };

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
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "flex-start", minHeight: "100vh", backgroundColor: "#f5faff", padding: 4 }}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 2, width: "45%", backgroundColor: "#1976d2", color: "white", marginRight: 3 }}>
        <Typography variant="h5" gutterBottom>Prompt Tester</Typography>
        <Typography variant="subtitle1" sx={{ color: 'white' }}>Enter Prompt</Typography>
        <Input
          multiline
          rows={12}
          fullWidth
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type your prompt here..."
          sx={{ mb: 2, backgroundColor: "white", color: "black", borderRadius: 1, p: 1 }}
        />
      </Paper>

      <Paper elevation={3} sx={{ p: 2, borderRadius: 2, width: "50%" }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Select Provider</Typography>
        <select value={provider} onChange={(e) => {
          setProvider(e.target.value);
          setModel(modelOptions[e.target.value][0]);
        }} style={{ width: "100%", padding: 4, marginBottom: 10, fontSize: 12 }}>
          <option value="openai">OpenAI</option>
          <option value="claude">Claude</option>
          <option value="mistral">Mistral</option>
          <option value="cohere">Cohere</option>
          <option value="meta">Meta (LLaMA)</option>
        </select>

        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>Select Model</Typography>
        <select value={model} onChange={(e) => setModel(e.target.value)} style={{ width: "100%", padding: 4, marginBottom: 8, fontSize: 12 }}>
          {modelOptions[provider].map(m => <option key={m} value={m}>{m}</option>)}
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
          <Box key={label} sx={{ mb: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>{label}</Typography>
            <select
              value={value}
              onChange={(e) => setter(e.target.value)}
              style={{ width: "100%", padding: 4, fontSize: 12 }}
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
