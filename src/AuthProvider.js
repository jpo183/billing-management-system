// src/components/AuthProvider.js
import React, { useEffect, useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';

const AuthProvider = ({ children }) => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Ensure React is fully initialized before rendering the provider
    setIsReady(true);
  }, []);

  if (!isReady) {
    return null; // or a loading spinner
  }

  const clientId = process.env.NODE_ENV === 'production' 
    ? 'your-production-client-id'
    : 'your-development-client-id';

  return (
    <GoogleOAuthProvider clientId={clientId}>
      {children}
    </GoogleOAuthProvider>
  );
};

export default AuthProvider;