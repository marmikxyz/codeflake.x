import { useState } from "react";

const PASSWORD = "@codeflake";

export default function PasswordGate({ onUnlock }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === PASSWORD) {
      setError("");
      onUnlock();
    } else {
      setError("Incorrect password. Try again.");
    }
  };

  return (
    <div className="password-gate">
      <div className="password-card">
        <div className="password-logo">CodeFlake</div>
        <p className="password-sub">Enter password to access the site</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            className="password-input"
            placeholder="Enter password"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
          {error && <p className="password-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}
