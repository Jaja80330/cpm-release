import React from 'react'
import { useTranslation } from 'react-i18next'

export default function TitleBar() {
  const { t } = useTranslation()
  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="7" cy="7" r="6" fill="#1976d2" />
          <text x="7" y="10.5" textAnchor="middle" fontSize="8" fontWeight="700" fill="#ffffff"
            fontFamily="Segoe UI Variable, Segoe UI, sans-serif">C</text>
        </svg>
        <span className="titlebar-logo">Cinnamon</span>
        <span className="titlebar-subtitle">{t('titlebar.subtitle')}</span>
      </div>

      <div className="titlebar-controls">
        <button className="titlebar-btn" onClick={() => window.api.window.minimize()} title={t('titlebar.minimize')}>
          <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
        </button>
        <button className="titlebar-btn" onClick={() => window.api.window.maximize()} title={t('titlebar.maximize')}>
          <svg width="9" height="9" viewBox="0 0 9 9">
            <rect x="0.5" y="0.5" width="8" height="8" stroke="currentColor" strokeWidth="1" fill="none"/>
          </svg>
        </button>
        <button className="titlebar-btn close" onClick={() => window.api.window.close()} title={t('titlebar.close')}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1.2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
