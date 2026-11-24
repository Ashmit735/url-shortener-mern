import React, { useState, useEffect } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [urls, setUrls] = useState([]);
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedStats, setSelectedStats] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchUrls = async () => {
    try {
      const res = await fetch(`${API}/api/urls`);
      if (res.ok) {
        const data = await res.json();
        setUrls(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = { originalUrl };
      if (customAlias.trim()) {
        payload.customAlias = customAlias.trim();
      }

      const res = await fetch(`${API}/api/urls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to shorten URL');
      } else {
        setOriginalUrl('');
        setCustomAlias('');
        setUrls((prev) => [data, ...prev.filter((u) => u._id !== data._id)]);
      }
    } catch (err) {
      setError('Network error, please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (shortCode, id) => {
    navigator.clipboard.writeText(`${API}/${shortCode}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleViewStats = async (id) => {
    try {
      const res = await fetch(`${API}/api/urls/${id}/analytics`);
      if (res.ok) {
        const data = await res.json();
        setSelectedStats(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>URL Shortener</h1>
        <p>Fast, clean link management</p>
      </header>

      <form onSubmit={handleSubmit} className="shorten-form">
        <div className="input-group">
          <input
            type="url"
            placeholder="Enter long URL (https://...)"
            value={originalUrl}
            onChange={(e) => setOriginalUrl(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Custom alias (optional)"
            value={customAlias}
            onChange={(e) => setCustomAlias(e.target.value)}
          />
          <button type="submit" disabled={loading}>
            {loading ? 'Shortening...' : 'Shorten'}
          </button>
        </div>
        {error && <div className="error-banner">{error}</div>}
      </form>

      <div className="content-layout">
        <div className="table-wrapper">
          <h2>All Links</h2>
          {urls.length === 0 ? (
            <p className="empty-state">No URLs generated yet.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Short Link</th>
                  <th>Original URL</th>
                  <th>Clicks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {urls.map((item) => (
                  <tr key={item._id}>
                    <td>
                      <a
                        href={`${API}/${item.shortCode}`}
                        target="_blank"
                        rel="noreferrer"
                        className="short-link"
                      >
                        {`${API}/${item.shortCode}`}
                      </a>
                    </td>
                    <td className="original-cell" title={item.originalUrl}>
                      {item.originalUrl}
                    </td>
                    <td>{item.totalClicks}</td>
                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          className="btn-action"
                          onClick={() => handleCopy(item.shortCode, item._id)}
                        >
                          {copiedId === item._id ? 'Copied!' : 'Copy'}
                        </button>
                        <button
                          type="button"
                          className="btn-action"
                          onClick={() => handleViewStats(item._id)}
                        >
                          Stats
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {selectedStats && (
          <aside className="stats-panel">
            <div className="stats-header">
              <h3>Analytics: /{selectedStats.url.shortCode}</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setSelectedStats(null)}
              >
                &times;
              </button>
            </div>
            <p className="stats-meta">
              <strong>Total Clicks:</strong> {selectedStats.url.totalClicks}
            </p>
            <h4>Recent 20 Clicks</h4>
            {selectedStats.clicks.length === 0 ? (
              <p className="empty-state">No clicks recorded yet.</p>
            ) : (
              <ul className="clicks-list">
                {selectedStats.clicks.map((click) => (
                  <li key={click._id} className="click-item">
                    <span className="timestamp">
                      {new Date(click.timestamp).toLocaleString()}
                    </span>
                    <span className="user-agent" title={click.userAgent}>
                      {click.userAgent}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
