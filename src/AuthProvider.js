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

  return (
    <GoogleOAuthProvider clientId="350399588039-ruea78cj6ho6bu230jg8d11207b8eqlt.apps.googleusercontent.com">
      {children}
    </GoogleOAuthProvider>
  );
};

export default AuthProvider;