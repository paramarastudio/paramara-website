import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("[MOBILE ERROR BOUNDARY] Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ background: '#09110F', minHeight: '100vh', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <img src="/assets/logo.png" alt="Paramara Logo" style={{ width: 60, height: 60, borderRadius: 14, marginBottom: 16 }} onError={(e) => { e.target.src = '/logo.png'; }} />
          <h2 style={{ fontSize: '1.25rem', color: '#EAB308', marginBottom: 8 }}>Paramara Studio Portal</h2>
          <p style={{ fontSize: '0.875rem', color: '#9CA3AF', maxWidth: 360, marginBottom: 20 }}>
            Terjadi pembaruan tampilan pada browser Anda. Silakan muat ulang halaman.
          </p>
          <button 
            onClick={() => { try { localStorage.clear(); } catch(e){} window.location.href = '/admin'; }} 
            style={{ padding: '10px 20px', borderRadius: 20, background: '#082F26', color: '#fff', border: '1px solid #059669', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 700 }}
          >
            Refresh Halaman Portal
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
