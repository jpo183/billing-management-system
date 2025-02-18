import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import "./App.css";

console.log('🔍 API_URL:', process.env.REACT_APP_API_URL);

const ClientBillingSetup = () => {
  const [billings, setBillings] = useState([]);
  const [billingItems, setBillingItems] = useState([]);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingBilling, setEditingBilling] = useState(null);
  const [selectedItem, setSelectedItem] = useState('');
  const [billingDate, setBillingDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [baseAmount, setBaseAmount] = useState('');
  const [perEmployeeAmount, setPerEmployeeAmount] = useState('');
  const [isActive, setIsActive] = useState(true);
  const { partnerId } = useParams();
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const navigate = useNavigate();

  const fetchClientBillings = useCallback(() => {
    try {
      console.log('📡 Fetching from:', `${process.env.REACT_APP_API_URL}/api/client-billings/${partnerId}`);
      fetch(`${process.env.REACT_APP_API_URL}/api/client-billings/${partnerId}`)
        .then(response => response.json())
        .then(data => {
          // Convert dates and ensure boolean values
          const processedData = data.map(billing => ({
            ...billing,
            billing_date: billing.billing_date.split('T')[0],
            end_date: billing.end_date ? billing.end_date.split('T')[0] : '',
            is_active: billing.is_active === true || billing.is_active === 't'
          }));
          setBillings(processedData);
        })
        .catch(error => console.error('Error fetching client billings:', error));
    } catch (error) {
      console.error('❌ Fetch error:', error);
    }
  }, [partnerId]);

  const fetchBillingItems = useCallback(() => {
    try {
      console.log('📡 Fetching billing items from:', `${process.env.REACT_APP_API_URL}/api/billing-items`);
      fetch(`${process.env.REACT_APP_API_URL}/api/billing-items`)
        .then(response => response.json())
        .then(data => setBillingItems(data.filter(item => item.is_active)))
        .catch(error => console.error('Error fetching billing items:', error));
    } catch (error) {
      console.error('❌ Fetch error:', error);
    }
  }, []);

  useEffect(() => {
    fetchClientBillings();
    fetchBillingItems();
  }, [fetchClientBillings, fetchBillingItems]);

  const handleSave = async () => {
    const billingData = {
      partner_id: partnerId,
      client_id: clientId,
      client_name: clientName,
      billing_item_id: selectedItem,
      billing_date: billingDate,
      end_date: endDate || null,
      base_amount: parseFloat(baseAmount) || 0,
      per_employee_amount: parseFloat(perEmployeeAmount) || 0,
      is_active: isActive
    };

    const url = editingBilling
      ? `${process.env.REACT_APP_API_URL}/api/client-billings/${editingBilling.id}`
      : `${process.env.REACT_APP_API_URL}/api/client-billings`;
    const method = editingBilling ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billingData)
      });

      if (!response.ok) throw new Error('Failed to save client billing');

      fetchClientBillings();
      resetForm();
    } catch (error) {
      console.error('Error saving client billing:', error);
    }
  };

  const handleEdit = (billing) => {
    setEditingBilling(billing);
    setSelectedItem(billing.billing_item_id);
    setBaseAmount(billing.base_amount || 0);
    setPerEmployeeAmount(billing.per_employee_amount || 0);
    setBillingDate(billing.billing_date);
    setEndDate(billing.end_date || '');
    setIsActive(billing.is_active);
    setClientId(billing.client_id);
    setClientName(billing.client_name);
    setIsFormVisible(true);
  };

const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this billing?')) return;

    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/client-billings/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete client billing');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Immediately update the local state to remove the deleted item
        setBillings(currentBillings => 
          currentBillings.filter(billing => billing.id !== id)
        );
      } else {
        throw new Error('Delete operation did not return success status');
      }
    } catch (error) {
      console.error('Error deleting client billing:', error);
      alert('Failed to delete billing item: ' + error.message);
    }
  };

  const resetForm = () => {
    setEditingBilling(null);
    setSelectedItem('');
    setBaseAmount('');
    setPerEmployeeAmount('');
    setBillingDate('');
    setEndDate('');
    setIsActive(true);
    setClientId('');
    setClientName('');
    setIsFormVisible(false);
  };
  
  

  return (
    <div className="container">
      <h2>Recurring Client Billing Management</h2>

      <button className="back-button" onClick={() => navigate('/partner-setup')}>
        Back to Partner Setup
      </button>

      <button className="add-button" onClick={() => setIsFormVisible(true)}>
        Add New Client Billing
      </button>

      {isFormVisible && (
        <div className="form-container">
          <h3>{editingBilling ? 'Edit Client Billing' : 'New Client Billing'}</h3>
          
          <label>Client ID:</label>
          <input 
            type="text" 
            value={clientId} 
            onChange={(e) => setClientId(e.target.value)}
          />

          <label>Client Name:</label>
          <input 
            type="text" 
            value={clientName} 
            onChange={(e) => setClientName(e.target.value)}
          />

          <label>Billing Item:</label>
          <select 
            value={selectedItem} 
            onChange={(e) => setSelectedItem(e.target.value)}
          >
            <option value="">Select Billing Item</option>
            {billingItems.map(item => (
              <option key={item.id} value={item.id}>
                {item.item_name} ({item.item_code})
              </option>
            ))}
          </select>

          <label>Base Amount:</label>
          <input 
            type="number" 
            step="0.01" 
            value={baseAmount} 
            onChange={(e) => setBaseAmount(e.target.value)}
          />

          <label>Per Employee Amount:</label>
          <input 
            type="number" 
            step="0.01" 
            value={perEmployeeAmount} 
            onChange={(e) => setPerEmployeeAmount(e.target.value)}
          />

          <label>Billing Date:</label>
          <input 
            type="date" 
            value={billingDate} 
            onChange={(e) => setBillingDate(e.target.value)}
          />

          <label>End Date:</label>
          <input 
            type="date" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)}
          />

          <div className="status-toggle">
            <label>
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
              />
              Active Status
            </label>
          </div>

          <div className="button-group">
            <button onClick={handleSave}>Save</button>
            <button onClick={resetForm}>Cancel</button>
          </div>
        </div>
      )}

      <table className="billing-table">
        <thead>
          <tr>
            <th>Client Name</th>
            <th>Billing Item</th>
            <th>Billing Date</th>
            <th>End Date</th>
            <th>Base Amount</th>
            <th>Per Employee</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {billings.map(billing => (
            <tr key={billing.id} className={!billing.is_active ? 'inactive-row' : ''}>
              <td>{billing.client_name}</td>
              <td>{billing.item_name}</td>
              <td>{new Date(billing.billing_date).toLocaleDateString()}</td>
              <td>{billing.end_date ? new Date(billing.end_date).toLocaleDateString() : '-'}</td>
              <td>${(Number(billing.base_amount) || 0).toFixed(2)}</td>
              <td>${(Number(billing.per_employee_amount) || 0).toFixed(2)}</td>
              <td>{billing.is_active ? '✅ Active' : '❌ Inactive'}</td>
              <td>
                <button onClick={() => handleEdit(billing)}>Edit</button>
                <button onClick={() => handleDelete(billing.id)} className="delete-button">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClientBillingSetup;