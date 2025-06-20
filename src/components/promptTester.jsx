import React, { useState } from "react";

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
    <div style={{ maxWidth: "700px", margin: "auto" }}>
      <h2>LLM Prompt Tester</h2>
      <textarea
        rows={6}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter your prompt here..."
        style={{ width: "100%" }}
      />

      <div><label>Model:</label>
        <select value={model} onChange={(e) => setModel(e.target.value)}>
          <option value="gpt-4">GPT-4</option>
          <option value="claude">Claude 3 Opus</option>
        </select>
      </div>

      <div><label>Temperature:</label>
        <select value={temperature} onChange={(e) => setTemperature(e.target.value)}>
          <option value="default">Default</option>
          <option value="0">0</option>
          <option value="0.5">0.5</option>
          <option value="1">1</option>
        </select>
      </div>

      <div><label>Max Tokens:</label>
        <select value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)}>
          <option value="default">Default</option>
          <option value="256">256</option>
          <option value="512">512</option>
          <option value="1024">1024</option>
        </select>
      </div>

      <div><label>Top P:</label>
        <select value={topP} onChange={(e) => setTopP(e.target.value)}>
          <option value="default">Default</option>
          <option value="0.5">0.5</option>
          <option value="0.8">0.8</option>
          <option value="1">1</option>
        </select>
      </div>

      <div><label>Frequency Penalty:</label>
        <select value={frequencyPenalty} onChange={(e) => setFrequencyPenalty(e.target.value)}>
          <option value="default">Default</option>
          <option value="0">0</option>
          <option value="0.5">0.5</option>
          <option value="1">1</option>
        </select>
      </div>

      <div><label>Presence Penalty:</label>
        <select value={presencePenalty} onChange={(e) => setPresencePenalty(e.target.value)}>
          <option value="default">Default</option>
          <option value="0">0</option>
          <option value="0.5">0.5</option>
          <option value="1">1</option>
        </select>
      </div>

      <button onClick={runPrompt} style={{ marginTop: 10 }}>
        {loading ? "Running..." : "Run Prompt"}
      </button>

      {error && <p style={{ color: "red" }}><strong>Error:</strong> {error}</p>}

      {response && (
        <div style={{ marginTop: 20 }}>
          <h4>LLM Response:</h4>
          <pre>{response}</pre>
          <p><strong>Latency:</strong> {info?.latency}s</p>
          <p><strong>Tokens Used:</strong> {info?.tokens}</p>
        </div>
      )}
    </div>
  );
}

export default PromptTester;
