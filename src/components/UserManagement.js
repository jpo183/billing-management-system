const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/users`); 

// Update role
const response = await axios.put(
    `${process.env.REACT_APP_API_URL}/api/users/${userId}/role`,
    { role: newRole }
);

// Delete user
const response = await axios.delete(
    `${process.env.REACT_APP_API_URL}/api/users/${userId}`
); 