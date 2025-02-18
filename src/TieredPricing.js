import React, { useState, useEffect } from "react";

const TieredPricing = ({ tiers, onTierChange, editingBillingId = null }) => {
  const [newTier, setNewTier] = useState({
    tier_min: "",
    tier_max: "",
    per_employee_rate: ""
  });
  const [tierErrors, setTierErrors] = useState([]);

  const validateTiers = (updatedTiers) => {
    const errors = [];
    updatedTiers.forEach((tier, index) => {
      if (index > 0) {
        const prevTier = updatedTiers[index - 1];
        if (parseInt(tier.tier_min) <= parseInt(prevTier.tier_max)) {
          errors.push(`Tier ${index + 1} overlaps with previous tier`);
        }
      }
      if (parseInt(tier.tier_min) >= parseInt(tier.tier_max)) {
        errors.push(`Tier ${index + 1} has invalid range`);
      }
    });
    return errors;
  };

  const handleAddTier = async () => {
    // Log initial state
    console.log('🏁 Starting handleAddTier:', {
      newTier,
      editingBillingId,
      existingTiers: tiers
    });

    if (!newTier.tier_min || !newTier.tier_max || !newTier.per_employee_rate) {
      console.warn('❌ Missing required fields:', newTier);
      alert("Please fill in all tier fields");
      return;
    }

    const requestBody = {
      partner_billing_id: editingBillingId,
      tier_min: parseInt(newTier.tier_min),
      tier_max: parseInt(newTier.tier_max),
      per_employee_rate: parseFloat(newTier.per_employee_rate)
    };

    console.log('📤 Sending request:', {
      url: 'https://billing-system-api-8m6c.onrender.com/api/billing-tiers',
      method: 'POST',
      body: requestBody
    });

    try {
      const response = await fetch('https://billing-system-api-8m6c.onrender.com/api/billing-tiers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📥 Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error('Failed to save tier');
      }

      const savedTier = await response.json();
      console.log('✅ Saved tier:', savedTier);
      
      const updatedTiers = [...tiers, savedTier];
      console.log('📊 Updated tiers:', updatedTiers);
      
      onTierChange(updatedTiers);
      setNewTier({ tier_min: "", tier_max: "", per_employee_rate: "" });
      setTierErrors([]);
    } catch (error) {
      console.error('❌ Error saving tier:', error);
      alert('Failed to save tier: ' + error.message);
    }
  };

const handleRemoveTier = async (index) => {
  const tierToRemove = tiers[index];

  if (!tierToRemove.id) {
    const updatedTiers = tiers.filter((_, i) => i !== index);
    onTierChange(updatedTiers);
    return;
  }

  try {
    const response = await fetch(`https://billing-system-api-8m6c.onrender.com/api/billing-tiers/${tierToRemove.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Failed to delete tier");
    }

    const updatedTiers = tiers.filter((_, i) => i !== index);
    onTierChange(updatedTiers);
  } catch (error) {
    console.error("Error deleting tier:", error);
  }
};


  useEffect(() => {
    if (editingBillingId) {
      const fetchTiers = async () => {
        try {
          const response = await fetch(`https://billing-system-api-8m6c.onrender.com/api/billing-tiers/${editingBillingId}`);
          const tierData = await response.json();
          onTierChange(tierData);
        } catch (error) {
          console.error("Error fetching tiers:", error);
        }
      };
      fetchTiers();
    } else {
      onTierChange([]);
    }
  }, [editingBillingId]);

  return (
    <div className="tiered-pricing-section">
      <h4>Tiered Pricing</h4>
      
      {tierErrors.length > 0 && (
        <div className="error-messages">
          <ul>
            {tierErrors.map((error, index) => (
              <li key={index} className="text-red-500">{error}</li>
            ))}
          </ul>
        </div>
      )}

      <table className="w-full mb-4">
        <thead>
          <tr>
            <th>Min Employees</th>
            <th>Max Employees</th>
            <th>Rate per Employee</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {tiers.map((tier, index) => (
            <tr key={index}>
              <td>{tier.tier_min}</td>
              <td>{tier.tier_max}</td>
              <td>${parseFloat(tier.per_employee_rate).toFixed(2)}</td>
              <td>
                <button onClick={() => handleRemoveTier(index)}>
                  Remove
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td>
              <input
                type="number"
                value={newTier.tier_min}
                onChange={(e) => setNewTier({...newTier, tier_min: e.target.value})}
                placeholder="Min"
                className="w-full"
              />
            </td>
            <td>
              <input
                type="number"
                value={newTier.tier_max}
                onChange={(e) => setNewTier({...newTier, tier_max: e.target.value})}
                placeholder="Max"
                className="w-full"
              />
            </td>
            <td>
              <input
                type="number"
                step="0.01"
                value={newTier.per_employee_rate}
                onChange={(e) => setNewTier({...newTier, per_employee_rate: e.target.value})}
                placeholder="Rate"
                className="w-full"
              />
            </td>
            <td>
              <button onClick={handleAddTier}>Add Tier</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default TieredPricing;

