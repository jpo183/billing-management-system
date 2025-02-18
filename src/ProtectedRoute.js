import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { hasPermission } from './roleConfig';
import axios from 'axios';

const ProtectedRoute = ({ element, route }) => {
    const [userRole, setUserRole] = useState(localStorage.getItem('userRole'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchRole = async () => {
            try {
                const userId = localStorage.getItem('userId');
                if (!userId) {
                    setLoading(false);
                    return;
                }

                const res = await axios.get(`http://localhost:5050/api/users/${userId}`);
                setUserRole(res.data.role);
                localStorage.setItem('userRole', res.data.role);
            } catch (error) {
                console.error("Error fetching user role:", error);
                setError(error);
            } finally {
                setLoading(false);
            }
        };

        fetchRole();
    }, []);

    if (loading) {
        return <div>Loading...</div>; // Or your loading component
    }

    if (error) {
        return <Navigate to="/login" replace />;
    }

    if (!userRole) {
        return <Navigate to="/login" replace />;
    }

    if (!hasPermission(userRole, route)) {
        return <Navigate to="/" replace />;
    }

    return element;
};

export default ProtectedRoute;

