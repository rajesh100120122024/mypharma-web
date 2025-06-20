import React, { useState } from "react";
import "./PromptTester.css"; // Optional external styling if needed

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
    <div className="prompt-tester-box">
      <h2 className="header">🧠 Prompt Tester</h2>
      <label className="label">Enter Prompt</label>
      <textarea
        rows={6}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Type your prompt here..."
        className="textarea"
      />

      <label className="label">Select Model</label>
      <select value={model} onChange={(e) => setModel(e.target.value)} className="select">
        <option value="gpt-4">GPT-4</option>
        <option value="claude">Claude 3 Opus</option>
        <option value="mistral">Mistral 7B (Groq)</option>
        <option value="command-r">Cohere Command R+</option>
        <option value="llama3">LLaMA 3 (OpenRouter)</option>
      </select>

      <label className="label">Temperature</label>
      <select value={temperature} onChange={(e) => setTemperature(e.target.value)} className="select">
        <option value="default">Default</option>
        <option value="0">0</option>
        <option value="0.5">0.5</option>
        <option value="1">1</option>
      </select>

      <label className="label">Max Tokens</label>
      <select value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} className="select">
        <option value="default">Default</option>
        <option value="256">256</option>
        <option value="512">512</option>
        <option value="1024">1024</option>
      </select>

      <label className="label">Top P</label>
      <select value={topP} onChange={(e) => setTopP(e.target.value)} className="select">
        <option value="default">Default</option>
        <option value="0.5">0.5</option>
        <option value="0.8">0.8</option>
        <option value="1">1</option>
      </select>

      <label className="label">Frequency Penalty</label>
      <select value={frequencyPenalty} onChange={(e) => setFrequencyPenalty(e.target.value)} className="select">
        <option value="default">Default</option>
        <option value="0">0</option>
        <option value="0.5">0.5</option>
        <option value="1">1</option>
      </select>

      <label className="label">Presence Penalty</label>
      <select value={presencePenalty} onChange={(e) => setPresencePenalty(e.target.value)} className="select">
        <option value="default">Default</option>
        <option value="0">0</option>
        <option value="0.5">0.5</option>
        <option value="1">1</option>
      </select>

      <button onClick={runPrompt} className="submit-button">
        {loading ? "Running..." : "SUBMIT & RUN PROMPT"}
      </button>

      {error && <p className="error">❌ Error: {error}</p>}

      {response && (
        <div className="result-box">
          <h4>🧾 Response</h4>
          <pre>{response}</pre>
          <p><strong>⏱️ Latency:</strong> {info?.latency}s</p>
          <p><strong>📊 Tokens Used:</strong> {info?.tokens}</p>
        </div>
      )}
    </div>
  );
}

export default PromptTester;
