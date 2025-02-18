import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                console.log('Fetching users from:', `${process.env.REACT_APP_API_URL}/api/users`);
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/users`);
                console.log('Users response:', response.data);
                setUsers(response.data);
            } catch (err) {
                console.error('Error fetching users:', err);
                setError(err.message);
            }
        };

        fetchUsers();
    }, []);

    // Update role
    const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/users/${userId}/role`,
        { role: newRole }
    );

    // Delete user
    const response = await axios.delete(
        `${process.env.REACT_APP_API_URL}/api/users/${userId}`
    );

    // Rest of your component code...
}; 