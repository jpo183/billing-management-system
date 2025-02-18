import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import "./App.css";

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');
    const currentUserRole = localStorage.getItem('userRole');
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const res = await axios.get('http://localhost:5050/api/users', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching users:', error);
            setLoading(false);
        }
    };

    const updateUserRole = async (id, newRole) => {
        try {
            const currentUserEmail = localStorage.getItem("userEmail");
            const currentUserId = localStorage.getItem("userId");
            
            // Prevent users from demoting themselves if they're an admin
            if (id === currentUserId && localStorage.getItem("userRole") === 'admin' && newRole !== 'admin') {
                alert("Administrators cannot demote themselves");
                return;
            }

            await axios.put(`http://localhost:5050/api/users/${id}/role`, 
                { role: newRole }, 
                { headers: { Authorization: `Bearer ${token}` }}
            );
            
            // Update local storage if current user
            if (users.find(user => user.id === id && user.email === currentUserEmail)) {
                localStorage.setItem("userRole", newRole);
            }

            fetchUsers();
        } catch (error) {
            console.error('Error updating user role:', error);
            alert('Failed to update user role');
        }
    };

    const deleteUser = async (id) => {
        try {
            const currentUserId = localStorage.getItem("userId");
            
            // Prevent admin from deleting themselves
            if (id === currentUserId) {
                alert("Administrators cannot delete their own account");
                return;
            }

            // Ask for confirmation
            if (!window.confirm("Are you sure you want to delete this user?")) {
                return;
            }

            await axios.delete(`http://localhost:5050/api/users/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            fetchUsers(); // Refresh the user list
            alert("User deleted successfully");
        } catch (error) {
            console.error('Error deleting user:', error);
            alert('Failed to delete user');
        }
    };

    return (
        <div className="billing-container">
            <h2>User Management</h2>
            <button className="back-button" onClick={() => navigate("/")}>
                Back to Main Menu
            </button>
            
            {loading ? <p>Loading users...</p> : (
                <table className="user-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Auth Type</th>
                            <th>Role</th>
                            <th>Actions</th>
                            {currentUserRole === 'admin' && <th>Delete</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>{user.name}</td>
                                <td>{user.email}</td>
                                <td>{user.google_id ? 'Google' : 'Regular'}</td>
                                <td>{user.role}</td>
                                <td>
                                    <select 
                                        value={user.role} 
                                        onChange={(e) => updateUserRole(user.id, e.target.value)}
                                        className={`role-select ${user.role}`}
                                        disabled={user.id === localStorage.getItem("userId") && user.role === 'admin'}
                                    >
                                        <option value="admin">Admin</option>
                                        <option value="billing_manager">Billing Manager</option>
                                        <option value="user">User</option>
                                    </select>
                                </td>
                                {currentUserRole === 'admin' && (
                                    <td>
                                        <button
                                            onClick={() => deleteUser(user.id)}
                                            className="delete-button"
                                            disabled={user.id === localStorage.getItem("userId")}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default UserManagement;

