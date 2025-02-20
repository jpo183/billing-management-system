import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const apiUrl = process.env.REACT_APP_API_URL || 'https://billing-system-api-8m6c.onrender.com';

    // Add this useEffect for environment logging
    useEffect(() => {
        console.log('Environment variables:', {
            NODE_ENV: process.env.NODE_ENV,
            REACT_APP_API_URL: process.env.REACT_APP_API_URL,
            apiUrl: apiUrl
        });
    }, []);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                console.log('Attempting to fetch users from:', apiUrl + '/api/users');
                const response = await axios.get(`${apiUrl}/api/users`);
                console.log('Users response:', response.data);
                setUsers(response.data);
            } catch (err) {
                console.error('Error details:', {
                    message: err.message,
                    response: err.response?.data,
                    config: err.config,
                    url: err.config?.url
                });
                setError(err.message);
            }
        };

        fetchUsers();
    }, []);

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            const response = await axios.put(
                `${apiUrl}/api/users/${userId}/role`,
                { role: newRole }
            );
            // Update users list
            setUsers(users.map(user => 
                user.id === userId ? response.data : user
            ));
        } catch (err) {
            console.error('Update error:', err);
            setError(err.message);
        }
    };

    return (
        <div>
            <h2>User Management</h2>
            <button className="back-button" onClick={() => navigate("/")}>
                Back to Main Menu
            </button>
            {error && <div className="error">{error}</div>}
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(user => (
                        <tr key={user.id}>
                            <td>{user.name}</td>
                            <td>{user.email}</td>
                            <td>{user.role}</td>
                            <td>
                                <select 
                                    value={user.role}
                                    onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                                >
                                    <option value="user">User</option>
                                    <option value="billing_manager">Billing Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UserManagement; 