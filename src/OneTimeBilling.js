import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";

import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || 'https://billing-system-api-8m6c.onrender.com';

const OneTimeBilling = () => {
  const { partnerId } = useParams();
  const [partners, setPartners] = useState([]);
  const [billingItems, setBillingItems] = useState([]);
  const [billingRecords, setBillingRecords] = useState([]);
  const [clientName, setClientName] = useState("");
  const [selectedPartner, setSelectedPartner] = useState("");
  const [selectedBillingItem, setSelectedBillingItem] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDate, setBillingDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate(); // Add navigation hook
  const [selectedPartnerFilter, setSelectedPartnerFilter] = useState("");

  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  // Fetch partners and billing items when component mounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔄 Fetching partners and billing items...');
        const [partnersResponse, billingItemsResponse] = await Promise.all([
          fetch(`${API_URL}/api/partners?showInactive=false`),
          fetch(`${API_URL}/api/billing-items`)
        ]);
        
        if (!partnersResponse.ok || !billingItemsResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const partnersData = await partnersResponse.json();
        const billingItemsData = await billingItemsResponse.json();
        
        console.log('📦 Loaded data:', {
          partners: partnersData,
          billingItems: billingItemsData
        });

        setPartners(partnersData);
        setBillingItems(billingItemsData.filter(item => item.is_active));
      } catch (error) {
        console.error("❌ Error fetching initial data:", error);
      }
    };

    fetchData();
  }, []);

  // Fetch ALL billing records
  const fetchBillingRecords = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 Fetching billing records...');
      const response = await fetch(`${API_URL}/api/addl-billings`);
      if (!response.ok) throw new Error('Failed to fetch billing records');
      
      const data = await response.json();
      console.log('📦 Loaded billing records:', data);
      setBillingRecords(data);
    } catch (error) {
      console.error("❌ Error fetching billing records:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBillingRecords();
  }, []);
  
  useEffect(() => {
  console.log('Current billing records:', billingRecords);
}, [billingRecords]);

  const handleSaveBilling = async (event) => {
    event.preventDefault();
    
    const newBilling = {
      partner_id: selectedPartner || partnerId,
      client_name: clientName,
      billing_item_id: selectedBillingItem,
      description: description,
      amount: parseFloat(amount),
      billing_date: billingDate,
    };

    try {
      console.log('💾 Saving billing record:', newBilling);
      const response = await fetch(`${API_URL}/api/addl-billings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newBilling),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save billing record');
      }

      await fetchBillingRecords();

      // Reset form
      setClientName("");
      setSelectedBillingItem("");
      setDescription("");
      setAmount("");
      setBillingDate("");
      setSelectedPartner("");
    } catch (error) {
      console.error("❌ Error adding billing record:", error);
      alert("Failed to save billing record. Please try again.");
    }
  };

const handleEditClick = (record) => {
  // Create a complete copy of the record with all necessary fields
  setEditingRecord({
    ...record,
    billing_item_id: record.billing_item_id || "", // Make sure this is set
    partner_id: record.partner_id || "",
    client_name: record.client_name || "",
    description: record.description || "",
    amount: record.amount || "",
    billing_date: record.billing_date ? record.billing_date.split('T')[0] : ""
  });
  setShowEditModal(true);
};

const handleDeleteClick = (record) => {
  console.log('1. Delete button clicked');
  console.log('2. Record received:', record);
  
  if (!record || !record.id) {
    console.error("Invalid record for deletion:", record);
    return;
  }
  console.log('3. Setting recordToDelete:', record);
  setRecordToDelete(record);
  console.log('4. Setting showDeleteModal to true');
  setShowDeleteModal(true);
};

const handleEditSubmit = async (event) => {
  event.preventDefault();
  
  const updatedBilling = {
    partner_id: editingRecord.partner_id,
    client_name: editingRecord.client_name,
    billing_item_id: editingRecord.billing_item_id, // This should now be properly set
    description: editingRecord.description,
    amount: parseFloat(editingRecord.amount),
    billing_date: editingRecord.billing_date,
  };

  try {
    const response = await fetch(`${API_URL}/api/addl-billings/${editingRecord.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updatedBilling),
    });

    if (!response.ok) {
      throw new Error('Failed to update billing record');
    }

    await fetchBillingRecords();
    setShowEditModal(false);
    setEditingRecord(null);
  } catch (error) {
    console.error("Error updating billing record:", error);
    alert("Failed to update billing record. Please try again.");
  }
};

const handleDelete = async () => {
  if (!recordToDelete?.id) {
    console.error('No record selected for deletion');
    return;
  }

  try {
    const deleteUrl = `${API_URL}/api/addl-billings/${recordToDelete.id}`;
    const response = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 400) {
        // Handle case where billing is used in active invoices
        alert(data.error);
        if (data.error.includes("void all related invoices")) {
          const proceed = window.confirm("Would you like to view the related invoices?");
          if (proceed) {
            navigate("/unfinalized-invoices");
          }
        }
        return;
      }
      throw new Error(data.error || 'Failed to delete billing record');
    }

    // Update local state to remove the deleted record
    setBillingRecords(prevRecords => 
      prevRecords.filter(record => record.id !== recordToDelete.id)
    );
    
    setShowDeleteModal(false);
    setRecordToDelete(null);
    alert("Record deleted successfully");

  } catch (error) {
    console.error('Error in delete process:', error);
    alert(`Failed to delete billing record: ${error.message}`);
  }
};

  return (
  
   
  
  
    <div className="billing-container">
        {/* Back to Main Menu Button */}
      <button className="back-button" onClick={() => navigate("/")}>
        Back to Main Menu
      </button>
      <h1 className="billing-title">One-Time Billing (Add-On Billing)</h1>
      

      {/* Add Form */}
      <form onSubmit={handleSaveBilling} className="billing-form">
        <div className="form-grid">
          <div className="form-group">
            <label>Select Partner:</label>
            <select
              value={selectedPartner || partnerId || ""}
              onChange={(e) => setSelectedPartner(e.target.value)}
              required
              className="select-input"
            >
              <option value="">-- Select a Partner --</option>
              {partners.map((partner) => (
                <option key={partner.id} value={partner.id}>
                  {partner.partner_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Client Name:</label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              required
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label>Billing Item:</label>
            <select
              value={selectedBillingItem}
              onChange={(e) => setSelectedBillingItem(e.target.value)}
              required
              className="select-input"
            >
              <option value="">-- Select a Billing Item --</option>
              {billingItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.item_name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Amount:</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="number-input"
            />
          </div>

          <div className="form-group">
            <label>Description:</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="text-input"
            />
          </div>

          <div className="form-group">
            <label>Billing Date:</label>
            <input
              type="date"
              value={billingDate}
              onChange={(e) => setBillingDate(e.target.value)}
              required
              className="date-input"
            />
          </div>
        </div>

        <button type="submit" className="submit-button">
          Save Billing
        </button>
      </form>
      
     {/* Filter Controls */}
      <div className="filter-controls">
        <div className="form-group" style={{ maxWidth: '300px', margin: '20px 0' }}>
          <label>Filter by Partner:</label>
          <select
            value={selectedPartnerFilter || ""}
            onChange={(e) => setSelectedPartnerFilter(e.target.value)}
            className="select-input"
          >
            <option value="">All Partners</option>
            {partners.map((partner) => (
              <option key={partner.id} value={partner.id}>
                {partner.partner_name}
              </option>
            ))}
          </select>
        </div>
      </div>
      
      

      {/* Billing Records Table */}
      <h2 className="billing-title">Existing Billing Records</h2>
      {isLoading ? (
        <div className="loading-message">Loading billing records...</div>
      ) : (
        <div className="table-container">
          <table className="billing-table">
            <thead>
              <tr>
                <th>Partner Name</th>
                <th>Client Name</th>
                <th>Billing Item</th>
                <th>Amount</th>
                <th>Description</th>
                <th>Billing Date</th>
                <th>Actions</th>
              </tr>
            </thead>
<tbody>
  {billingRecords
    .filter(record => !selectedPartnerFilter || record.partner_id.toString() === selectedPartnerFilter)
    .map((record) => {
      console.log('Rendering record:', record);
      return (
        <tr key={record.id}>
          <td>{record.partner_name}</td>
          <td>{record.client_name}</td>
          <td>{record.item_name}</td>
          <td>${parseFloat(record.amount).toFixed(2)}</td>
          <td>{record.description}</td>
          <td>{new Date(record.billing_date).toLocaleDateString()}</td>
          <td>
            <button
              onClick={() => handleEditClick(record)}
              className="edit-button"
            >
              Edit
            </button>
            <button
              onClick={() => {
                console.log('Delete button in table clicked');
                handleDeleteClick(record);
              }}
              className="delete-button"
            >
              Delete
            </button>
          </td>
        </tr>
      );
    })}
</tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="modal">
          <div className="modal-content">
            <h2>Edit Billing Record</h2>
            <form onSubmit={handleEditSubmit}>
              <div className="form-group">
                <label>Partner:</label>
                <select
                  value={editingRecord?.partner_id || ""}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    partner_id: e.target.value
                  })}
                  required
                  className="select-input"
                >
                  {partners.map((partner) => (
                    <option key={partner.id} value={partner.id}>
                      {partner.partner_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Client Name:</label>
                <input
                  type="text"
                  value={editingRecord?.client_name || ""}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    client_name: e.target.value
                  })}
                  required
                  className="text-input"
                />
              </div>

              <div className="form-group">
                <label>Billing Item:</label>
                <select
                  value={editingRecord?.billing_item_id || ""}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    billing_item_id: e.target.value
                  })}
                  required
                  className="select-input"
                >
                  {billingItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.item_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Amount:</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingRecord?.amount || ""}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    amount: e.target.value
                  })}
                  required
                  className="number-input"
                />
              </div>

              <div className="form-group">
                <label>Description:</label>
                <input
                  type="text"
                  value={editingRecord?.description || ""}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    description: e.target.value
                  })}
                  required
                  className="text-input"
                />
              </div>

              <div className="form-group">
                <label>Billing Date:</label>
                <input
                  type="date"
                  value={editingRecord?.billing_date ? editingRecord.billing_date.split('T')[0] : ""}
                  onChange={(e) => setEditingRecord({
                    ...editingRecord,
                    billing_date: e.target.value
                  })}
                  required
                  className="date-input"
                />
              </div>

              <div className="modal-buttons">
                <button type="submit" className="submit-button">
                  Save Changes
                </button>
                <button 
                  type="button" 
                  onClick={() => setShowEditModal(false)}
                  className="cancel-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
{showDeleteModal && (
  <div className="modal">
    <div className="modal-content">
      <h2>Confirm Delete</h2>
      <p>Are you sure you want to delete this billing record?</p>
      <div className="modal-buttons">
        <button
          onClick={() => {
            console.log('Delete confirmation button clicked');
            handleDelete();
          }}
          className="delete-button"
        >
          Delete
        </button>
        <button
          onClick={() => {
            console.log('Cancel button clicked');
            setShowDeleteModal(false);
            setRecordToDelete(null);
          }}
          className="cancel-button"
        >
          Cancel
        </button>
      </div>
    </div>
  </div>
)}
      
    </div>
  );
};

export default OneTimeBilling;
