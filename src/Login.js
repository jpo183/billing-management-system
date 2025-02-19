import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const Login = () => {
    const navigate = useNavigate();
    

    useEffect(() => {
        // Initialize Google Sign-In
        const googleInit = () => {
            console.log('Initializing Google Sign-In...');
            const google = window.google;
            if (google && google.accounts) {
                google.accounts.id.initialize({
                    client_id: "350399588039-ruea78cj6ho6bu230jg8d11207b8eqlt.apps.googleusercontent.com",
                    callback: handleCredentialResponse
                });

                console.log('Rendering Google button...');
                google.accounts.id.renderButton(
                    document.getElementById("googleSignInDiv"),
                    { theme: "outline", size: "large" }
                );
            }
        };

        // Check if the Google script is loaded
        if (window.google) {
            console.log('Google script already loaded');
            googleInit();
        } else {
            console.log('Waiting for Google script to load');
            const script = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
            if (script) {
                script.onload = googleInit;
            }
        }
    }, []);

const handleCredentialResponse = async (response) => {
    console.log('Received Google response:', response);
    try {
        const decoded = jwtDecode(response.credential);
        console.log('Decoded token:', decoded);
        
        console.log('Sending to backend...');
        const backendResponse = await axios.post(
            `${process.env.REACT_APP_API_URL}/api/google-auth`,
            { 
                credential: response.credential,
                google_id: decoded.sub,
                email: decoded.email,
                name: decoded.name
            }
        );

        console.log('Backend response:', backendResponse.data);

        // Check if backend response has a valid ID
        if (!backendResponse.data || !backendResponse.data.id) {
            console.error('❌ Error: No user ID returned from backend.');
            return;
        }

        // Fetch user from backend using the correct ID
        const userId = backendResponse.data.id;
        console.log(`Fetching user with ID: ${userId}`);
        const userResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/users/${userId}`);

        // Store updated user info
        localStorage.setItem('userRole', userResponse.data.role);
        localStorage.setItem('userEmail', userResponse.data.email);
        localStorage.setItem('userName', userResponse.data.name);

        // ✅ Ensure the role is correctly set before navigating
        setTimeout(() => {
            console.log('✅ Navigating to home...');
            window.location.href = "/";
        }, 500);
    } catch (error) {
        console.error('❌ Login error:', error);
        if (error.response) {
            console.error('❌ Backend error details:', {
                status: error.response.status,
                data: error.response.data,
                headers: error.response.headers
            });
        }
    }
};




    return (
        <div className="login-container">
            <h1>Welcome to Billing System</h1>
            <div id="googleSignInDiv"></div>
        </div>
    );
};

// log out
export const logoutAndForceLogin = () => {
    console.log("🔄 Starting logout process...");
    
    const googleAuthInstance = window.google?.accounts?.id;
    if (googleAuthInstance) {
        console.log("🔑 Disabling Google auto-select...");
        googleAuthInstance.disableAutoSelect();
    }

    console.log("🗑️ Clearing localStorage...");
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('token');

    // Use the full Render.com URL
    window.location.href = "https://billing-system-frontend.onrender.com/login";
    console.log("↪️ Redirect initiated");
};



export default Login;
