import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const GenerateInvoice = () => {
 const navigate = useNavigate();
 const [partners, setPartners] = useState([]);
 const [selectedPartner, setSelectedPartner] = useState("");
 const [months, setMonths] = useState([]);
 const [selectedMonth, setSelectedMonth] = useState("");
 const [startDate, setStartDate] = useState("");
 const [endDate, setEndDate] = useState("");
 const [monthlyData, setMonthlyData] = useState([]);
 const [recurringPartnerBilling, setRecurringPartnerBilling] = useState([]);
 const [oneTimeBillings, setOneTimeBillings] = useState([]);
 const [employeeTiers, setEmployeeTiers] = useState([]);
 const [selectedMonthlyItems, setSelectedMonthlyItems] = useState([]);
 const [selectedRecurringItems, setSelectedRecurringItems] = useState([]);
 const [selectedOneTimeItems, setSelectedOneTimeItems] = useState([]);

 const [baseFee, setBaseFee] = useState(null);
 const [perEmployeeFee, setPerEmployeeFee] = useState(null);
 const [oneTimeBillingOverrides, setOneTimeBillingOverrides] = useState({});
 const [oneTimeOverrideReasons, setOneTimeOverrideReasons] = useState({});
 const [recurringBillingOverrides, setRecurringBillingOverrides] = useState({});
 const [recurringOverrideReason, setRecurringOverrideReason] = useState({});
 const [monthlyMinFee, setMonthlyMinFee] = useState(null);
const [modifiedRecurringBilling, setModifiedRecurringBilling] = useState([]);
  
  
 
 
 const handleRecurringOverrideReason = (id, reason) => {
  setRecurringOverrideReason(prev => ({
    ...prev,
    [id]: reason
  }));
};

 

 const handleSelectAllMonthly = (e) => {
   if (e.target.checked) {
     setSelectedMonthlyItems(monthlyData.map(item => item.client_code));
   } else {
     setSelectedMonthlyItems([]);
   }
 };

 const handleSelectAllRecurring = (e) => {
  if (e.target.checked) {
    setSelectedRecurringItems(recurringPartnerBilling.map((item, index) => 
      item.id || `client-billing-${index}`
    ));
  } else {
    setSelectedRecurringItems([]);
  }
};

 const handleSelectAllOneTime = (e) => {
   if (e.target.checked) {
     setSelectedOneTimeItems(oneTimeBillings.map(item => item.id));
   } else {
     setSelectedOneTimeItems([]);
   }
 };

 const handleMonthlyItemSelect = (clientCode) => {
   setSelectedMonthlyItems(prev => 
     prev.includes(clientCode)
       ? prev.filter(code => code !== clientCode)
       : [...prev, clientCode]
   );
 };



 const handleOneTimeItemSelect = (id) => {
   setSelectedOneTimeItems(prev =>
     prev.includes(id)
       ? prev.filter(itemId => itemId !== id)
       : [...prev, id]
   );
 };

 const handleOneTimeAmountOverride = (id, value) => {
   setOneTimeBillingOverrides(prev => ({
     ...prev,
     [id]: value
   }));
 };

 const handleRecurringAmountOverride = (id, value) => {
   setRecurringBillingOverrides(prev => ({
     ...prev,
     [id]: value
   }));
 };

 const handleOneTimeOverrideReason = (id, reason) => {
   setOneTimeOverrideReasons(prev => ({
     ...prev,
     [id]: reason
   }));
 };

const handleRecurringItemSelect = (id, index) => {  // Add index parameter
  setSelectedRecurringItems((prev) => {
    const identifier = id || `client-billing-${index}`;  // Create unique identifier if id is null
    if (prev.includes(identifier)) {
      return prev.filter((itemId) => itemId !== identifier);
    } else {
      return [...prev, identifier];
    }
  });
};


const handleGenerateInvoice = async () => {
  const partner = partners.find(p => p.id === parseInt(selectedPartner));
  if (!partner) {
    alert('Partner information not found');
    return;
  }

  // Calculate total base EIN fees and monthly min billed
  const selectedClients = monthlyData.filter(item => selectedMonthlyItems.includes(item.client_code));
  
  const totalBaseEINFeesAcrossClients = selectedClients.reduce((total, item) => {
    const isActive = item.is_pay_group_active;
    const baseAmount = isActive ? parseFloat(baseFee?.amount || 0) : 0;
    const employeeFeeAmount = isActive 
      ? calculateTieredFee(item.total_active_employees)
      : 0;
    
    return total + (baseAmount + employeeFeeAmount);
  }, 0);

  const minFeeAmount = parseFloat(monthlyMinFee?.amount || 0);
  const monthlyMinBilledTotal = minFeeAmount > totalBaseEINFeesAcrossClients 
    ? (minFeeAmount - totalBaseEINFeesAcrossClients) 
    : 0;

  const invoiceData = {
    partner_id: parseInt(selectedPartner),
    partner_code: partner.partner_code,
    partner_name: partner.partner_name,
    invoice_month: selectedMonth,
    invoice_date: new Date().toISOString().split('T')[0],
    monthly_fees: selectedClients.map(item => {
      const isActive = item.is_pay_group_active;
      const baseAmount = isActive 
        ? Number(parseFloat(baseFee?.amount || 0).toFixed(2)) 
        : 0;

      const totalEmployeeFees = isActive 
        ? calculateTieredFee(item.total_active_employees)
        : 0;

      const totalMonthlyFee = Number((baseAmount + totalEmployeeFees).toFixed(2));

      return {
        client_code: item.client_code,
        client_name: item.client_name,
        is_pay_group_active: isActive,
        total_active_employees: isActive ? item.total_active_employees : 0,
        base_fee_amount: baseAmount,
        per_employee_fee_amount: totalEmployeeFees,
        total_monthly_fee: totalMonthlyFee,
        partner_id: parseInt(selectedPartner),
        partner_code: partner.partner_code
      };
    }),

    recurring_fees: [
      // Include monthly minimum fee if applicable
      ...(monthlyMinBilledTotal > 0 && monthlyMinFee ? [{
        partner_billing_id: monthlyMinFee.id,
        partner_id: parseInt(selectedPartner),
        partner_code: partner.partner_code,
        client_name: 'Monthly Minimum Fee',
        item_name: monthlyMinFee.item_name,
        item_code: monthlyMinFee.item_code || '',
        billing_item_id: monthlyMinFee.id,
        original_amount: monthlyMinBilledTotal,
        invoiced_amount: monthlyMinBilledTotal,
        override_reason: null,
        billing_frequency: 'monthly'
      }] : []),

      // Include selected recurring partner billing items
...recurringPartnerBilling
  .filter(item => selectedRecurringItems.includes(item.id))
  .map(item => {
    let calculatedAmount;
    if (item.billing_source === 'client_billing' && item.per_employee_amount) {
      // Find corresponding monthly data for employee count
      const monthlyEntry = monthlyData.find(m => m.client_code === item.client_id);
      
      if (monthlyEntry) {
        calculatedAmount = parseFloat(item.base_amount || 0) + 
          (monthlyEntry.total_active_employees * parseFloat(item.per_employee_amount));
      } else {
        calculatedAmount = parseFloat(item.amount || 0);
      }
    } else {
      calculatedAmount = parseFloat(item.amount || 0);
    }

    return {
      partner_billing_id: item.id,
      partner_id: parseInt(selectedPartner),
      partner_code: partner.partner_code,
      client_name: item.client_name || 'N/A',
      item_name: item.item_name,
      item_code: item.item_code || '',
      billing_item_id: item.billing_item_id,
      original_amount: calculatedAmount,
      invoiced_amount: parseFloat(recurringBillingOverrides[item.id] || calculatedAmount),
      override_reason: recurringOverrideReason[item.id] || null,
      billing_frequency: item.billing_frequency
    };
  })
    ],

    one_time_fees: oneTimeBillings
      .filter(item => selectedOneTimeItems.includes(item.id))
      .map(item => ({
        addl_billing_id: item.id,
        partner_id: parseInt(selectedPartner),
        partner_code: partner.partner_code,
        client_name: item.client_name,
        item_name: item.item_name,
        item_code: item.item_code || '',
        billing_item_id: item.billing_item_id,
        billing_date: item.billing_date,
        original_amount: parseFloat(item.amount),
        invoiced_amount: parseFloat(oneTimeBillingOverrides[item.id] || item.amount),
        override_reason: oneTimeOverrideReasons[item.id] || null
      }))
  };

try {
  const missingReasons = [];
  
  invoiceData.recurring_fees.forEach(fee => {
    // Change this check to only require reason if there's a manual override
    if (recurringBillingOverrides[fee.partner_billing_id] !== undefined && 
        !fee.override_reason) {
      missingReasons.push(`Missing override reason for recurring billing item: ${fee.item_name}`);
    }
  });

  invoiceData.one_time_fees.forEach(fee => {
    if (fee.original_amount !== fee.invoiced_amount && !fee.override_reason) {
      missingReasons.push(`Missing override reason for one-time billing item: ${fee.item_name}`);
    }
  });

  if (missingReasons.length > 0) {
    alert('Please provide reasons for all overridden amounts:\n\n' + missingReasons.join('\n'));
    return;
  }

     const response = await fetch('http://localhost:5050/api/generate-invoice', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify(invoiceData)
     });

     if (!response.ok) {
       throw new Error('Failed to generate invoice');
     }

     const result = await response.json();
     navigate(`/invoice-review/${result.invoice_id}`);
   } catch (error) {
     console.error('Error generating invoice:', error);
     alert('Failed to generate invoice. Please try again.');
   }
 };

 useEffect(() => {
   fetch("http://localhost:5050/api/partners")
     .then((response) => response.json())
     .then((data) => setPartners(data))
     .catch(() => setPartners([]));
 }, []);

 useEffect(() => {
   fetch("http://localhost:5050/fetch-distinct-months")
     .then((response) => response.json())
     .then((data) => setMonths(data))
     .catch(() => setMonths([]));
 }, []);

 useEffect(() => {
  if (selectedPartner && selectedMonth) {
    const partner = partners.find(p => p.id === parseInt(selectedPartner));
     
    if (partner?.partner_code) {
      fetch(`http://localhost:5050/monthly-billing/partner/${partner.partner_code}/${selectedMonth}`)
        .then((response) => response.json())
        .then((data) => setMonthlyData(data.length > 0 ? data : []))
        .catch((error) => {
          console.error("Error fetching monthly data:", error);
          setMonthlyData([]);
        });
    }

fetch(`http://localhost:5050/api/partner-billing/${selectedPartner}`)
  .then((response) => response.json())
  .then((data) => {
    console.group('Partner Billing Item Processing');
    console.log("Raw Partner Billing Data:", data);
    
    const activeItems = data.filter(item => {
      const isActive = item.is_active === true || item.is_active === 't' || item.is_active === 1;
      const now = new Date();
      const startDate = item.start_date ? new Date(item.start_date) : null;
      const endDate = item.end_date ? new Date(item.end_date) : null;

      const isWithinDateRange = 
        (!startDate || startDate <= now) && 
        (!endDate || endDate >= now);

      return isActive && isWithinDateRange;
    });

    console.log("Detailed Active Items:", activeItems.map(item => ({
      id: item.id,
      billing_type: item.billing_type,
      amount: item.amount,
      is_active: item.is_active,
      start_date: item.start_date,
      end_date: item.end_date
    })));

  const itemsWithClientNames = activeItems.map(item => ({
  ...item,
  client_name: item.billing_source === 'client_billing' ? item.client_name : item.item_name
}));

    console.log("Items with client names:", itemsWithClientNames);

    const standardItems = itemsWithClientNames.filter(item => 
      item.billing_type !== 'base_ein' && 
      item.billing_type !== 'per_employee'
    );

    console.log("Standard items before setting state:", standardItems.map(item => ({
      id: item.id,
      client_name: item.client_name,
      item_name: item.item_name,
      amount: item.amount,
      billing_source: item.billing_source
    })));

    setRecurringPartnerBilling(standardItems);

        const baseItem = activeItems.find(item => item.billing_type === 'base_ein');
        if (baseItem) setBaseFee(baseItem);

        const perEmployeeItem = activeItems.find(item => item.billing_type === 'per_employee');
if (perEmployeeItem) {
  console.log('Setting Per Employee Fee:', {
    ...perEmployeeItem,
    parsedAmount: parseFloat(perEmployeeItem.amount),
    parsedPerEmployeeAmount: parseFloat(perEmployeeItem.per_employee_amount)
  });
  setPerEmployeeFee(perEmployeeItem);
}
        const monthlyMinItem = activeItems.find(item => item.billing_type === 'monthly_min');
        if (monthlyMinItem) {
          // If multiple monthly min items exist, choose the first one
          setMonthlyMinFee(monthlyMinItem);
        }

        // After finding perEmployeeItem
        if (perEmployeeItem) {
          setPerEmployeeFee(perEmployeeItem);
          // Fetch tiers for the per-employee billing item
          fetch(`http://localhost:5050/api/billing-tiers/${perEmployeeItem.id}`)
            .then((response) => response.json())
            .then((tiers) => {
              // Sort tiers by minimum tier value
              const sortedTiers = tiers.sort((a, b) => a.tier_min - b.tier_min);
              setEmployeeTiers(sortedTiers);
              
              // Log the sorted tiers for verification
              console.log('Sorted Employee Tiers:', sortedTiers);
            })
            .catch((error) => {
              console.error('Error fetching employee tiers:', error);
              setEmployeeTiers([]);
            });
        }
console.log("Final standardItems before setting state:", standardItems.map(item => ({
  id: item.id,
  client_name: item.client_name,
  item_name: item.item_name,
  amount: item.amount,
  is_active: item.is_active,
  billing_source: item.billing_source
})));
        setRecurringPartnerBilling(standardItems);
        
         console.log('Processed Recurring Billing Data:', standardItems.map(item => ({
          id: item.id,
          client_name: item.client_name,
          billing_source: item.billing_source,
          item_name: item.item_name
        })));
        
        console.log('All items:', data);
        console.log('Active items:', activeItems);
        console.log('Standard items:', standardItems);
        console.log('Base fee:', baseItem);
        console.log('Per employee fee:', perEmployeeItem);
      })
      .catch((error) => {
        console.error('Error fetching partner billing items:', error);
        
        setRecurringPartnerBilling([]);
        setBaseFee(null);
        setPerEmployeeFee(null);
      });
  }
}, [selectedPartner, selectedMonth, partners]);
 
 

 useEffect(() => {
   if (selectedPartner && startDate && endDate) {
   
     fetch(`http://localhost:5050/api/addl-billings/${selectedPartner}?start_date=${startDate}&end_date=${endDate}`)
       .then((response) => response.json())
       .then((data) => setOneTimeBillings(data.length > 0 ? data : []))
       .catch(() => setOneTimeBillings([]));
   }
 }, [selectedPartner, startDate, endDate]);
 
const calculateTieredFee = (employeeCount) => {
  console.group('Calculate Tiered Fee Detailed Breakdown');
  console.log('Input Employee Count:', employeeCount);
  console.log('Per Employee Fee Object:', perEmployeeFee);
  console.log('Per Employee Fee Amount:', perEmployeeFee ? perEmployeeFee.amount : 'N/A');
  console.log('Per Employee Fee Item Properties:', {
    amount: perEmployeeFee?.amount,
    billing_type: perEmployeeFee?.billing_type,
    per_employee_amount: perEmployeeFee?.per_employee_amount
  });
  console.log('Employee Tiers:', employeeTiers);

  // If no per-employee fee is set or amount is zero, return 0
  if (!perEmployeeFee || 
      (parseFloat(perEmployeeFee.amount) === 0 && 
       parseFloat(perEmployeeFee.per_employee_amount) === 0)) {
    console.log('No valid per-employee fee - Returning 0');
    console.groupEnd();
    return 0;
  }

  // Determine which amount to use
  const feeAmount = parseFloat(perEmployeeFee.per_employee_amount) || 
                    parseFloat(perEmployeeFee.amount) || 0;

  // If no tiers are defined, use flat rate
  if (!employeeTiers.length) {
    const flatRateFee = Number((employeeCount * feeAmount).toFixed(2));
    console.log('No tiers defined - Using flat rate', {
      employeeCount,
      feeAmount,
      flatRateFee
    });
    console.groupEnd();
    return flatRateFee;
  }

  let totalFee = 0;
  let remainingEmployees = employeeCount;

  // Sort tiers to ensure correct processing
  const sortedTiers = [...employeeTiers].sort((a, b) => a.tier_min - b.tier_min);
  console.log('Sorted Tiers:', sortedTiers);

  for (const tier of sortedTiers) {
    const tierMin = parseInt(tier.tier_min);
    const tierMax = parseInt(tier.tier_max);
    const rate = parseFloat(tier.per_employee_rate);

    console.log('Current Tier Processing:', {
      tierMin,
      tierMax,
      rate,
      remainingEmployees
    });

    if (remainingEmployees <= 0) break;

    const employeesInTier = Math.min(
      remainingEmployees,
      tierMax - tierMin + 1
    );

    const tierFee = Number((employeesInTier * rate).toFixed(2));
    console.log('Tier Fee Calculation:', {
      employeesInTier,
      rate,
      tierFee
    });

    totalFee = Number((totalFee + tierFee).toFixed(2));
    remainingEmployees -= employeesInTier;
  }

  console.log('Final Total Fee:', totalFee);
  console.groupEnd();
  return totalFee;
};



 return (
   <div className="container">
     <h2>Generate Invoice</h2>
     <button className="back-button" onClick={() => navigate("/")}>Back to Main Menu</button>
     
     <div>
       <label>Partner:</label>
       <select value={selectedPartner} onChange={(e) => setSelectedPartner(e.target.value)}>
         <option value="">-- Select Partner --</option>
         {partners.map((partner) => (
           <option key={partner.id} value={partner.id}>{partner.partner_name}</option>
         ))}
       </select>
     </div>
     
     <div>
       <label>Month:</label>
       <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
         <option value="">-- Select Month --</option>
         {months.map((month) => (
           <option key={month} value={month}>{month}</option>
         ))}
       </select>
     </div>
     
     <div>
       <label>Start Date:</label>
       <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
       <label>End Date:</label>
       <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
     </div>
     
<h3>Monthly Billing Data</h3>
{monthlyData.length > 0 ? (
  <>
 {selectedMonthlyItems.length > 0 && (() => {
  // Define selectedClients within this scope
  const selectedClients = monthlyData.filter(item => selectedMonthlyItems.includes(item.client_code));
  
  // Find the partner for the current selection
  const partner = partners.find(p => p.id === parseInt(selectedPartner));

  // Calculate total base EIN fees across ALL selected clients
  const totalBaseEINFeesAcrossClients = selectedClients.reduce((total, item) => {
    const isActive = item.is_pay_group_active;
    const baseAmount = isActive ? parseFloat(baseFee?.amount || 0) : 0;
    const employeeFeeAmount = isActive ? calculateTieredFee(item.total_active_employees) : 0;
    return total + (baseAmount + employeeFeeAmount);
  }, 0);

  const minFeeAmount = parseFloat(monthlyMinFee?.amount || 0);
  const monthlyMinBilledTotal = minFeeAmount > totalBaseEINFeesAcrossClients 
    ? (minFeeAmount - totalBaseEINFeesAcrossClients) 
    : 0;

// Update or create monthly minimum fee if applicable
const existingMinFeeIndex = recurringPartnerBilling.findIndex(item => 
  item.billing_type === 'monthly_min' || item.item_name === monthlyMinFee?.item_name
);

if (monthlyMinBilledTotal > 0 && partner && monthlyMinFee) {
  const minFeeItem = {
    id: monthlyMinFee.id,
    partner_id: parseInt(selectedPartner),
    partner_code: partner.partner_code,
    client_name: 'Monthly Minimum Fee',
    item_name: monthlyMinFee.item_name,
    item_code: monthlyMinFee.item_code || '',
    billing_item_id: monthlyMinFee.id,
    amount: monthlyMinBilledTotal,
    billing_frequency: 'monthly',
    billing_type: 'monthly_min'
  };

  if (existingMinFeeIndex >= 0) {
    // Update existing monthly minimum fee
    recurringPartnerBilling[existingMinFeeIndex] = minFeeItem;
  } else {
    // Add monthly minimum fee for the first time
    recurringPartnerBilling.unshift(minFeeItem); // Add to beginning of array
  }
} else if (existingMinFeeIndex >= 0) {
  // Remove monthly minimum fee if it exists but is no longer needed
  recurringPartnerBilling.splice(existingMinFeeIndex, 1);
}

  return (
    <div className="billing-summary" style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
      <h4>Monthly Minimum Fee Comparison</h4>
      <p>Total Base EIN Fees: ${totalBaseEINFeesAcrossClients.toFixed(2)}</p>
      <p>Monthly Minimum Threshold: ${minFeeAmount.toFixed(2)}</p>
      {monthlyMinBilledTotal > 0 && (
        <p style={{ fontWeight: 'bold', color: '#d32f2f' }}>
          Additional Monthly Minimum Fee Billed: ${monthlyMinBilledTotal.toFixed(2)}
        </p>
      )}
    </div>
  );
})()}

    <table>
<thead>
  <tr>
    <th>
      <input
        type="checkbox"
        onChange={handleSelectAllMonthly}
        checked={selectedMonthlyItems.length === monthlyData.length}
      />
    </th>
    <th>Client Code</th>
    <th>Client Name</th>
    <th>Is Pay Group Active</th>
    <th>Total Active Employees</th>
    <th>Base Fee</th>
    <th>Per Employee Fees</th>
    <th>Total Monthly Fees</th>
  </tr>
</thead>
      <tbody>
{monthlyData.map((row, index) => {
  const isActive = row.is_pay_group_active;
  const baseAmount = isActive ? parseFloat(baseFee?.amount || 0) : 0;
  const totalEmployeeFees = isActive 
    ? calculateTieredFee(row.total_active_employees)
    : 0;
  const totalMonthlyFee = baseAmount + totalEmployeeFees;

  // Find applicable tier for display
  const activeTier = employeeTiers.find(
    tier => row.total_active_employees >= tier.tier_min && 
            row.total_active_employees <= tier.tier_max
  );

  return (
    <tr key={index}>
      <td>
        <input
          type="checkbox"
          checked={selectedMonthlyItems.includes(row.client_code)}
          onChange={() => handleMonthlyItemSelect(row.client_code)}
        />
      </td>
      <td>{row.client_code}</td>
      <td>{row.client_name}</td>
      <td>{row.is_pay_group_active ? "Yes" : "No"}</td>
      <td>{row.total_active_employees}</td>
      <td>${baseAmount.toFixed(2)}</td>
      <td>
        ${totalEmployeeFees.toFixed(2)}
        {activeTier && (
          <span className="text-sm text-gray-500">
            {` (Rate: $${activeTier.per_employee_rate}/employee)`}
          </span>
        )}
      </td>
      <td>${totalMonthlyFee.toFixed(2)}</td>
    </tr>
  );
})}
      </tbody>
    </table>
  </>
) : <p>No data available for this section.</p>}

{/* Recurring Partner Client Billings */}
<h3>Recurring Partner Client Billings</h3>
{recurringPartnerBilling.length > 0 ? (
  <table>
    <thead>
      <tr>
        <th>
          <input
            type="checkbox"
            onChange={handleSelectAllRecurring}
            checked={selectedRecurringItems.length === recurringPartnerBilling.length}
          />
        </th>
        <th>Client Name</th>
        <th>Item Name</th>
        <th>Original Amount</th>
        <th>Invoiced Amount</th>
        <th>Override Reason</th>
        <th>Billing Frequency</th>
        <th>Start Date</th>
        <th>End Date</th>
      </tr>
    </thead>
    <tbody>
{recurringPartnerBilling.map((row, index) => {
  const calculatedAmount = row.billing_source === 'client_billing' && row.per_employee_amount
    ? parseFloat(row.base_amount || 0) + (monthlyData.find(m => m.client_code === row.client_id)?.total_active_employees || 0) * parseFloat(row.per_employee_amount || 0)
    : parseFloat(row.amount || 0);
  
  const hasOverride = recurringBillingOverrides[row.id] !== undefined;
  const invoicedAmount = hasOverride 
    ? parseFloat(recurringBillingOverrides[row.id]) 
    : calculatedAmount;
  
  // Only consider it different if there's a manual override
  const amountDiffers = hasOverride && (calculatedAmount !== invoicedAmount);
  const displayClientName = row.client_name ?? 'N/A';

  return (
    <tr key={index}>
      <td>
        <input
          type="checkbox"
          checked={selectedRecurringItems.includes(row.id || `client-billing-${index}`)}
          onChange={() => handleRecurringItemSelect(row.id, index)}
        />
      </td>
      <td>{displayClientName}</td>
      <td>{row.item_name}</td>
      <td>${calculatedAmount.toFixed(2)}</td>
      <td>
        <input
          type="number"
          step="0.01"
          value={invoicedAmount}
          onChange={(e) => handleRecurringAmountOverride(row.id, e.target.value)}
          className={amountDiffers ? 'amount-override' : ''}
        />
      </td>
      <td>
        {amountDiffers && (
          <input
            type="text"
            value={recurringOverrideReason[row.id] || ''}
            onChange={(e) => handleRecurringOverrideReason(row.id, e.target.value)}
            placeholder="Required if amount changed"
            className={amountDiffers && !recurringOverrideReason[row.id] ? 'required-reason' : ''}
          />
        )}
      </td>
      <td>{row.billing_frequency}</td>
      <td>{new Date(row.start_date).toLocaleDateString()}</td>
      <td>{row.end_date ? new Date(row.end_date).toLocaleDateString() : "N/A"}</td>
    </tr>
  );
})}
    </tbody>
  </table>
) : <p>No data available for this section.</p>}

      {/* One-Time Billings */}
      <h3>One-Time Billings</h3>
      {oneTimeBillings.length > 0 ? (
        <table>
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={handleSelectAllOneTime}
                  checked={selectedOneTimeItems.length === oneTimeBillings.length}
                />
              </th>
              <th>Client Name</th>
              <th>Billing Date</th>
              <th>Original Amount</th>
              <th>Invoiced Amount</th>
              <th>Override Reason</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {oneTimeBillings.map((row, index) => {
              const hasOverride = oneTimeBillingOverrides[row.id] !== undefined;
              const originalAmount = parseFloat(row.amount);
              const invoicedAmount = hasOverride 
                ? parseFloat(oneTimeBillingOverrides[row.id]) 
                : originalAmount;
              const amountDiffers = originalAmount !== invoicedAmount;

              return (
                <tr key={index}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedOneTimeItems.includes(row.id)}
                      onChange={() => handleOneTimeItemSelect(row.id)}
                    />
                  </td>
                  <td>{row.client_name}</td>
                  <td>{new Date(row.billing_date).toLocaleDateString()}</td>
                  <td>${originalAmount.toFixed(2)}</td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={invoicedAmount}
                      onChange={(e) => handleOneTimeAmountOverride(row.id, e.target.value)}
                      className={amountDiffers ? 'amount-override' : ''}
                    />
                  </td>
                  <td>
                    {amountDiffers && (
                      <input
                        type="text"
                        value={oneTimeOverrideReasons[row.id] || ''}
                        onChange={(e) => handleOneTimeOverrideReason(row.id, e.target.value)}
                        placeholder="Required if amount changed"
                        className={amountDiffers && !oneTimeOverrideReasons[row.id] ? 'required-reason' : ''}
                      />
                    )}
                  </td>
                  <td>{row.description || "N/A"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : <p>No data available for this section.</p>}
      
        <button 
        className="generate-button"
        onClick={handleGenerateInvoice}
        disabled={!selectedPartner || !selectedMonth}
      >
        Generate Invoice
      </button>
      
    </div>
  );
};

export default GenerateInvoice;












