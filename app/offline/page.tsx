// app/offline/page.tsx
"use client"

export default function OfflinePage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0a0a0a',
      color: '#fff',
      gap: '1rem',
      textAlign: 'center',
      padding: '2rem',
    }}>
      <img
        src="/zeta.png"
        alt="EMS"
        style={{ width: 80, height: 80 }}
      />
      <h1 style={{ color: '#C9A84C', fontSize: '1.5rem' }}>
        You are Offline
      </h1>
      <p style={{ color: '#888', maxWidth: 300 }}>
        Please check your internet connection and try again.
      </p>
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '0.75rem 2rem',
          background: '#C9A84C',
          color: '#000',
          border: 'none',
          borderRadius: '8px',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        Try Again
      </button>
    </div>
  )
}