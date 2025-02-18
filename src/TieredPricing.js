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

  const handleAddTier = () => {
    if (!newTier.tier_min || !newTier.tier_max || !newTier.per_employee_rate) {
      alert("Please fill in all tier fields");
      return;
    }

    const updatedTiers = [...tiers, newTier];
    const errors = validateTiers(updatedTiers);
    
    if (errors.length > 0) {
      setTierErrors(errors);
      return;
    }

    onTierChange(updatedTiers);
    setNewTier({ tier_min: "", tier_max: "", per_employee_rate: "" });
    setTierErrors([]);
  };

const handleRemoveTier = async (index) => {
  const tierToRemove = tiers[index];

  if (!tierToRemove.id) {
    // If the tier is new (not saved in DB), just remove it locally
    const updatedTiers = tiers.filter((_, i) => i !== index);
    onTierChange(updatedTiers);
    return;
  }

  try {
    const response = await fetch(`http://localhost:5050/api/billing-tiers/${tierToRemove.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Failed to delete tier");
    }

    // Remove the tier from the UI **after** the server confirms deletion
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
          const response = await fetch(`http://localhost:5050/api/billing-tiers/${editingBillingId}`);
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

