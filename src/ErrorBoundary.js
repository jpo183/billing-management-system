// src/ErrorBoundary.js
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          maxWidth: '800px',
          margin: '0 auto'
        }}>
          <h1>Something went wrong</h1>
          <div style={{ margin: '20px 0', textAlign: 'left' }}>
            <h3>Error Details:</h3>
            <pre style={{ 
              backgroundColor: '#f8f8f8', 
              padding: '15px',
              borderRadius: '5px',
              whiteSpace: 'pre-wrap'
            }}>
              {this.state.error && this.state.error.toString()}
            </pre>
            <h3>Component Stack:</h3>
            <pre style={{ 
              backgroundColor: '#f8f8f8', 
              padding: '15px',
              borderRadius: '5px',
              whiteSpace: 'pre-wrap'
            }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </pre>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              padding: '10px 20px', 
              margin: '10px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;