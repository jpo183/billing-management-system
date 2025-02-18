import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TieredPricing from './TieredPricing';
import "./App.css";

const PartnerBillingSetup = () => {
  const { partnerId } = useParams();
  const navigate = useNavigate();
  const [showInactive, setShowInactive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // State Management
  const [partner, setPartner] = useState(null);
  const [billingItems, setBillingItems] = useState([]);
  const [billingRecords, setBillingRecords] = useState([]);
  const [selectedBillingTiers, setSelectedBillingTiers] = useState([]);

  // Form State
  const [selectedBillingItem, setSelectedBillingItem] = useState("");
  const [amount, setAmount] = useState("");
  const [billingFrequency, setBillingFrequency] = useState("Monthly");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [editingRecord, setEditingRecord] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch existing partner billing records
const fetchBillingRecords = useCallback(async () => {
  try {
    setIsLoading(true);
    const billingResponse = await fetch(`https://billing-system-api-8m6c.onrender.com/api/partner-billing/${partnerId}`);
    const billingData = await billingResponse.json();

    // Fetch tiers for per_employee billing types
    const recordsWithTiers = await Promise.all(
      billingData.map(async (record) => {
        if (record.billing_type === "per_employee") {
          try {
            const tiersResponse = await fetch(`https://billing-system-api-8m6c.onrender.com/api/billing-tiers/${record.id}`);
            const tiers = await tiersResponse.json();
            return { ...record, tiers };
          } catch (error) {
            console.error(`Error fetching tiers for record ${record.id}:`, error);
            return { ...record, tiers: [] };
          }
        }
        return { ...record, tiers: [] };
      })
    );

    setBillingRecords(recordsWithTiers);
    setIsLoading(false);
  } catch (error) {
    console.error("Error fetching partner billing records:", error);
    setIsLoading(false);
  }
}, [partnerId]);

  // Fetch initial data
  useEffect(() => {
    Promise.all([
      fetch(`https://billing-system-api-8m6c.onrender.com/api/partners/${partnerId}`).then(res => res.json()),
      fetch("https://billing-system-api-8m6c.onrender.com/api/billing-items").then(res => res.json())
    ])
    .then(([partnerData, billingItemsData]) => {
      setPartner(partnerData);
      setBillingItems(billingItemsData);
      fetchBillingRecords();
    })
    .catch((error) => {
      console.error("Error fetching initial data:", error);
      setIsLoading(false);
    });
  }, [partnerId, fetchBillingRecords]);

  // Handle Editing a Record
const handleEdit = (record) => {
  setEditingRecord(record);
  setSelectedBillingItem(record.billing_item_id.toString());
  setAmount(record.amount.toString());
  setBillingFrequency(record.billing_frequency);
  
  // Format dates properly for the date inputs
setStartDate(record.start_date ? new Date(record.start_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
setEndDate(record.end_date ? new Date(record.end_date).toISOString().split("T")[0] : "");


  if (record.billing_type === "per_employee") {
    fetch(`https://billing-system-api-8m6c.onrender.com/api/billing-tiers/${record.id}`)
      .then((response) => response.json())
      .then((tierData) => setSelectedBillingTiers(tierData))
      .catch((error) => console.error("Error fetching tiers:", error));
  } else {
    setSelectedBillingTiers([]);
  }
};

  // Handle Save (Create or Update)
  const handleSaveBilling = async () => {
    console.log('💾 Starting handleSaveBilling:', {
      selectedBillingItem,
      selectedItem: billingItems.find((item) => item.id.toString() === selectedBillingItem),
      editingRecord,
      selectedBillingTiers
    });

    const selectedItem = billingItems.find((item) => item.id.toString() === selectedBillingItem);
    if (!selectedItem) {
      alert("⚠️ Please select a valid billing item.");
      return;
    }

 const billingData = {
  partner_id: parseInt(partnerId),
  billing_item_id: parseInt(selectedBillingItem),
  amount: selectedItem.billing_type === "per_employee" ? 0 : parseFloat(amount),
  billing_frequency: billingFrequency,
  start_date: startDate ? new Date(startDate).toISOString().split("T")[0] : null,
  end_date: endDate ? new Date(endDate).toISOString().split("T")[0] : null,
  is_active: isActive,
};



    let savedBilling;
    if (editingRecord) {
      const response = await fetch(`https://billing-system-api-8m6c.onrender.com/api/partner-billing/${editingRecord.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billingData),
      });
      savedBilling = await response.json();
    } else {
      const response = await fetch("https://billing-system-api-8m6c.onrender.com/api/partner-billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(billingData),
      });
      savedBilling = await response.json();
    }

    if (selectedItem.billing_type === "per_employee" && selectedBillingTiers.length > 0) {
      console.log('📊 Saving tiers for billing item:', {
        billingId: savedBilling.id,
        tiers: selectedBillingTiers
      });

      try {
        // Delete existing tiers if editing
        if (editingRecord) {
          await fetch(`https://billing-system-api-8m6c.onrender.com/api/billing-tiers/${editingRecord.id}`, {
            method: 'DELETE'
          });
        }

        // Save new tiers
        for (const tier of selectedBillingTiers) {
          const tierData = {
            partner_billing_id: savedBilling.id,
            tier_min: parseInt(tier.tier_min),
            tier_max: parseInt(tier.tier_max),
            per_employee_rate: parseFloat(tier.per_employee_rate)
          };

          console.log('📤 Saving tier:', tierData);

          const response = await fetch('https://billing-system-api-8m6c.onrender.com/api/billing-tiers', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(tierData)
          });

          if (!response.ok) {
            throw new Error('Failed to save tier');
          }
        }
      } catch (error) {
        console.error('❌ Error saving tiers:', error);
        alert('Failed to save tiers');
        return;
      }
    }

    resetForm();
    fetchBillingRecords();
  };

  const handleDelete = (recordId) => {
    if (!window.confirm("Are you sure you want to delete this billing item?")) return;
    fetch(`https://billing-system-api-8m6c.onrender.com/api/partner-billing/${recordId}`, { method: "DELETE" })
      .then(() => fetchBillingRecords())
      .catch((error) => console.error("Error deleting billing record:", error));
  };

  const resetForm = () => {
    setEditingRecord(null);
    setSelectedBillingItem("");
    setAmount("");
    setBillingFrequency("Monthly");
    setStartDate(new Date().toISOString().split("T")[0]);
    setEndDate("");
    setIsActive(true);
    setSelectedBillingTiers([]);
  };

  if (!partner) return <div>Loading partner data...</div>;

  return (
    <div className="container">
      <h2>Billing Setup for {partner.partner_name}</h2>
      <button className="back-button" onClick={() => navigate("/partner-setup")}>Back to Partner List</button>

      <div className="billing-form">
        <h3>{editingRecord ? "Edit Billing Item" : "Add Billing Item"}</h3>

          <select value={selectedBillingItem} onChange={(e) => setSelectedBillingItem(e.target.value)}>
          <option value="">-- Select an Item --</option>
          {billingItems
            .filter(item => item.is_active) // Only show active billing items
            .map((item) => (
              <option key={item.id} value={item.id}>{item.item_name}</option>
            ))
          }
        </select>

        {selectedBillingItem && billingItems.find((item) => item.id.toString() === selectedBillingItem)?.billing_type === "per_employee" && (
          <TieredPricing tiers={selectedBillingTiers} onTierChange={setSelectedBillingTiers} editingBillingId={editingRecord?.id} />
        )}

        <button onClick={handleSaveBilling}>{editingRecord ? "Update Billing Item" : "Save Billing Item"}</button>
     
  {editingRecord && (
  <button onClick={resetForm} style={{ marginLeft: "10px", backgroundColor: "#ccc", padding: "5px" }}>
    Cancel
  </button>
)}

{/* Show the Amount field only for standard items */}
{selectedBillingItem && billingItems.find((item) => item.id.toString() === selectedBillingItem)?.billing_type !== "per_employee" && (
  <>
    <label>Amount:</label>
    <input
      type="number"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      placeholder="Enter amount"
    />
  </>
)}

{/* Start Date Input */}
<label>Start Date:</label>
<input
  type="date"
  value={startDate}
  onChange={(e) => setStartDate(e.target.value)}
/>

{/* End Date Input */}
<label>End Date:</label>
<input
   type="date"
  value={endDate}
  onChange={(e) => setEndDate(e.target.value)}
/>

{/* Active Status Toggle */}
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
     
      </div>
      
                 
      
      <div>
      <table className="billing-items-table">
  <thead>
    <tr>
      <th>Item Name</th>
      <th>Amount</th>
      <th>Billing Frequency</th>
      <th>Start Date</th>
      <th>End Date</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
<tbody>
  {billingRecords.length > 0 ? (
    billingRecords.map((record) => (
      <tr key={record.id}>
        <td>{record.item_name || "⚠️ Missing Name"}</td>
        <td>
          {record.billing_type === "per_employee" ? (
            <span className="tiered-pricing">
              Tiered Pricing ℹ️
              <div className="tooltip">
        {record.tiers ? (
  record.tiers.map((tier, index) => (
    <div key={index}>
      {tier.tier_min}-{tier.tier_max}: ${tier.per_employee_rate}/employee
    </div>
  ))
) : (
  "Click Edit to view tiers"
)}
              </div>
            </span>
          ) : (
            `$${record.amount ? parseFloat(record.amount).toFixed(2) : "0.00"}`
          )}
        </td>
        <td>{record.billing_frequency || "N/A"}</td>
        <td>{record.start_date || "N/A"}</td>
        <td>{record.end_date || "N/A"}</td>
        <td>{record.is_active ? "✅ Active" : "❌ Inactive"}</td>
        <td>
          <button onClick={() => handleEdit(record)}>✏️ Edit</button>
          <button onClick={() => handleDelete(record.id)} style={{ marginLeft: "5px", color: "red" }}>🗑️ Delete</button>
        </td>
      </tr>
    ))
  ) : (
    <tr>
      <td colSpan="7" style={{ textAlign: "center", color: "red" }}>
        ⚠️ No billing records found
      </td>
    </tr>
  )}
</tbody>
</table>
     </div> 
      
    </div>
  );
};




export default PartnerBillingSetup;










