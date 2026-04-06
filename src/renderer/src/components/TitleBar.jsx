import React from 'react'

export default function TitleBar() {
  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="8" cy="8" r="7" fill="var(--colorBrandBackground)" />
          <text x="8" y="12" textAnchor="middle" fontSize="9" fontWeight="700" fill="#ffffff"
            fontFamily="Segoe UI Variable, Segoe UI, sans-serif">C</text>
        </svg>
        <span className="titlebar-logo">Cinnamon</span>
        <span className="titlebar-subtitle">Asset Manager · NEROSY</span>
      </div>

      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={() => window.api.window.minimize()} title="Réduire">
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
        </button>
        <button className="titlebar-btn" onClick={() => window.api.window.maximize()} title="Agrandir">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0.5" y="0.5" width="9" height="9" stroke="currentColor" strokeWidth="1" fill="none"/>
          </svg>
        </button>
        <button className="titlebar-btn close" onClick={() => window.api.window.close()} title="Fermer">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
