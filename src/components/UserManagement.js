import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [error, setError] = useState(null);

    const API_URL = process.env.REACT_APP_API_URL || 'https://billing-system-api-8m6c.onrender.com';

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                console.log('Using API URL:', API_URL);
                const response = await axios.get(`${API_URL}/api/users`);
                console.log('Users response:', response.data);
                setUsers(response.data);
            } catch (err) {
                console.error('Error details:', {
                    message: err.message,
                    response: err.response?.data,
                    config: err.config
                });
                setError(err.message);
            }
        };

        fetchUsers();
    }, []);

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            const response = await axios.put(
                `${API_URL}/api/users/${userId}/role`,
                { role: newRole },
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
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