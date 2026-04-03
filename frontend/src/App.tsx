import { useState, useEffect } from 'react'
import './App.css'

interface HealthStatus {
  status: string
  timestamp: string
  service: string
}

function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/v1/health')
      .then((res) => res.json())
      .then((data) => setHealth(data))
      .catch(() => setError('Backend unavailable'))
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <h1>☁️ Cloud ManagementAI</h1>
        <p>Cloud infrastructure optimization and automation platform</p>
      </header>
      <main className="app-main">
        <section className="status-card">
          <h2>API Status</h2>
          {error && <p className="status-error">{error}</p>}
          {health && (
            <ul>
              <li><strong>Status:</strong> {health.status}</li>
              <li><strong>Service:</strong> {health.service}</li>
              <li><strong>Timestamp:</strong> {health.timestamp}</li>
            </ul>
          )}
          {!health && !error && <p>Loading…</p>}
        </section>
      </main>
    </div>
  )
}

export default App
