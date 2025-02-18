import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const BillingItems = () => {
  const [billingItems, setBillingItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState(true);
  const [billingType, setBillingType] = useState("standard");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showActive, setShowActive] = useState(true);
  const navigate = useNavigate();

  const fetchBillingItems = () => {
    fetch("http://localhost:5050/api/billing-items")
      .then((response) => response.json())
      .then((data) => setBillingItems(data))
      .catch((error) => console.error("Error fetching billing items:", error));
  };

  useEffect(() => {
    fetchBillingItems();
  }, []);

  const generateItemCode = () => {
    return "BI-" + Math.floor(1000 + Math.random() * 9000);
  };

  const handleSave = () => {
    const billingItemData = {
      item_code: itemCode || generateItemCode(),
      item_name: itemName,
      description,
      is_active: status,
      billing_type: billingType
    };

    const url = editingItem
      ? `http://localhost:5050/api/billing-items/${editingItem.id}`
      : "http://localhost:5050/api/billing-items";
    const method = editingItem ? "PUT" : "POST";

    fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(billingItemData),
    })
      .then(() => {
        fetchBillingItems();
        resetForm();
      })
      .catch((error) => console.error("Error saving billing item:", error));
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setItemCode(item.item_code);
    setItemName(item.item_name);
    setDescription(item.description);
    setStatus(item.is_active);
    setBillingType(item.billing_type || 'standard');
    setIsFormVisible(true);
  };

  const resetForm = () => {
    setIsFormVisible(false);
    setEditingItem(null);
    setItemCode("");
    setItemName("");
    setDescription("");
    setStatus(true);
    setBillingType("standard");
  };

  const handleDelete = (id) => {
    if (!window.confirm("Are you sure you want to delete this billing item?")) {
      return;
    }

    fetch(`http://localhost:5050/api/billing-items/${id}`, {
      method: "DELETE",
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((err) => {
            throw new Error(err.error || "Failed to delete billing item");
          });
        }
        fetchBillingItems();
      })
      .catch((error) => {
        console.error("Error deleting billing item:", error);
        alert(`Error: ${error.message}`);
      });
  };

  const handleFilterToggle = () => {
    setShowActive((prev) => !prev);
  };

  const filteredBillingItems = billingItems.filter((item) => 
    showActive ? item.is_active === true : item.is_active === false
  );

  return (
    <div className="container">
      <h2>Billing Items Management</h2>
      <button className="back-button" onClick={() => navigate("/")}>
        Back to Main Menu
      </button>

      <button className="add-button" onClick={() => setIsFormVisible(true)}>
        Add New Billing Item
      </button>

      <button className="filter-button" onClick={handleFilterToggle}>
        Show {showActive ? "Inactive" : "Active"} Items
      </button>

      {isFormVisible && (
        <div className="form-container">
          <h3>{editingItem ? "Edit Billing Item" : "New Billing Item"}</h3>
          <label>Item Code:</label>
          <input
            type="text"
            value={itemCode}
            onChange={(e) => setItemCode(e.target.value)}
            placeholder="Enter Item Code"
          />

          <label>Item Name:</label>
          <input
            type="text"
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            placeholder="Enter Item Name"
          />

          <label>Description:</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter Description"
          />

        <label>Billing Type:</label>
<select
  value={billingType}
  onChange={(e) => setBillingType(e.target.value)}
>
  <option value="standard">Standard</option>
  <option value="base_ein">Base EIN Fee</option>
  <option value="per_employee">Per Employee Fee</option>
  <option value="monthly_min">Monthly Minimum Fee</option> {/* Add this line */}
</select>


          <label>Status:</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value === "true")}
          >
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <div className="button-group">
            <button className="save-button" onClick={handleSave}>
              Save
            </button>
            <button className="cancel-button" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <table className="billing-items-table">
        <thead>
          <tr>
            <th>Item Code</th>
            <th>Item Name</th>
            <th>Description</th>
            <th>Billing Type</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredBillingItems.length > 0 ? (
            filteredBillingItems.map((item) => (
              <tr key={item.id}>
                <td>{item.item_code}</td>
                <td>{item.item_name}</td>
                <td>{item.description}</td>
                <td>{item.billing_type || 'standard'}</td>
                <td>{item.is_active ? "Active" : "Inactive"}</td>
                <td>
                  <button onClick={() => handleEdit(item)}>Edit</button>
                  <button onClick={() => handleDelete(item.id)} className="delete-button">
                    Delete
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", color: "red" }}>
                No {showActive ? "Active" : "Inactive"} Billing Items Found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default BillingItems;




