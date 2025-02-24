import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || 'https://billing-system-api-8m6c.onrender.com';

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
  console.group('🔄 Generate Invoice Process');
  
  try {
    // 1. Aggregate monthly data
    const aggregatedMonthlyData = aggregateMonthlyData(monthlyData);
    console.log('📊 Aggregated monthly data:', aggregatedMonthlyData);

    // 2. Validate all billings
    const validatedRecurring = recurringPartnerBilling.map(item => 
      validateRecurringBilling(item, aggregatedMonthlyData)
    );
    
    // 3. Check for warnings
    const warnings = validatedRecurring
      .filter(item => item.hasWarnings)
      .map(item => `${item.item_name}: ${item.warnings.join(', ')}`);
      
    if (warnings.length > 0) {
      const proceed = window.confirm(
        `The following warnings were found:\n\n${warnings.join('\n')}\n\nDo you want to proceed?`
      );
      if (!proceed) {
        console.log('❌ User cancelled due to warnings');
        return;
      }
    }

    // 4. Prepare invoice data with aggregated values
    const invoiceData = {
      partner_id: parseInt(selectedPartner),
      partner_code: partners.find(p => p.id === parseInt(selectedPartner)).partner_code,
      partner_name: partners.find(p => p.id === parseInt(selectedPartner)).partner_name,
      invoice_month: selectedMonth,
      invoice_date: new Date().toISOString().split('T')[0],
      monthly_fees: aggregatedMonthlyData
        .filter(item => selectedMonthlyItems.includes(item.client_code))
        .map(item => ({
          client_code: item.client_code,
          client_name: item.client_name,
          is_pay_group_active: item.is_pay_group_active,
          total_active_employees: item.total_active_employees,
          base_fee_amount: parseFloat(baseFee?.amount || 0),
          per_employee_fee_amount: calculateTieredFee(item.total_active_employees),
          total_monthly_fee: calculateTieredFee(item.total_active_employees),
          partner_id: parseInt(selectedPartner),
          partner_code: partners.find(p => p.id === parseInt(selectedPartner)).partner_code
        })),

      recurring_fees: [
        // Include monthly minimum fee if applicable
        ...(monthlyMinFee ? [{
          partner_billing_id: monthlyMinFee.id,
          partner_id: parseInt(selectedPartner),
          partner_code: partners.find(p => p.id === parseInt(selectedPartner)).partner_code,
          client_name: 'Monthly Minimum Fee',
          item_name: monthlyMinFee.item_name,
          item_code: monthlyMinFee.item_code || '',
          billing_item_id: monthlyMinFee.id,
          original_amount: monthlyMinFee.amount,
          invoiced_amount: (() => {
            // Calculate the actual billed amount
            const selectedClients = monthlyData.filter(item => 
              selectedMonthlyItems.includes(item.client_code)
            );
            const totalBaseEINFees = selectedClients.reduce((total, item) => {
              const isActive = item.is_pay_group_active;
              const baseAmount = isActive ? parseFloat(baseFee?.amount || 0) : 0;
              return total + baseAmount;
            }, 0);
            
            const minFeeAmount = parseFloat(monthlyMinFee.amount || 0);
            return minFeeAmount > totalBaseEINFees 
              ? (minFeeAmount - totalBaseEINFees) 
              : 0;
          })(),
          override_reason: 'Monthly minimum fee adjustment',
          billing_frequency: 'monthly'
        }] : []),

        // Include selected recurring partner billing items
        ...recurringPartnerBilling
          .filter(item => {
            const isSelected = selectedRecurringItems.includes(item.id);
            console.log('🔍 Checking item:', {
              id: item.id,
              name: item.item_name,
              isSelected,
              billing_source: item.billing_source,
              client_name: item.client_name,
              partner_id: item.partner_id
            });
            return isSelected;
          })
          .map(item => {
            console.log('💫 Processing recurring item:', {
              id: item.id,
              billing_item_id: item.billing_item_id,
              item_name: item.item_name,
              billing_source: item.billing_source,
              client_name: item.client_name,
              base_amount: item.base_amount,
              per_employee_amount: item.per_employee_amount,
              client_id: item.client_id,
              amount: item.amount,
              partner_id: item.partner_id
            });

            let calculatedAmount;
            if (item.billing_source === 'client_billing' && item.per_employee_amount) {
              const monthlyEntry = monthlyData.find(m => m.client_code === item.client_id);
              console.log('📊 Monthly data for client:', {
                client_id: item.client_id,
                found: !!monthlyEntry,
                employees: monthlyEntry?.total_active_employees
              });
              
              if (monthlyEntry) {
                calculatedAmount = parseFloat(item.base_amount || 0) + 
                  (monthlyEntry.total_active_employees * parseFloat(item.per_employee_amount));
              } else {
                calculatedAmount = parseFloat(item.amount || 0);
              }
            } else {
              calculatedAmount = parseFloat(item.amount || 0);
            }

            console.log('💰 Amount calculation:', {
              original: item.amount,
              calculated: calculatedAmount,
              override: recurringBillingOverrides[item.id],
              final: parseFloat(recurringBillingOverrides[item.id] || calculatedAmount)
            });

            const mappedItem = {
              partner_billing_id: recurringPartnerBilling.find(pb => 
                pb.billing_source === 'partner_billing' && 
                pb.billing_item_id === item.billing_item_id
              )?.id,
              partner_id: parseInt(selectedPartner),
              partner_code: partners.find(p => p.id === parseInt(selectedPartner)).partner_code,
              client_name: item.client_name || 'N/A',
              item_name: item.item_name,
              item_code: item.item_code || '',
              billing_item_id: item.billing_item_id,
              original_amount: calculatedAmount,
              invoiced_amount: parseFloat(recurringBillingOverrides[item.id] || calculatedAmount),
              override_reason: recurringOverrideReason[item.id] || null,
              billing_frequency: item.billing_frequency
            };

            console.log('📝 Mapped recurring fee:', {
              original_id: item.id,
              billing_item_id: item.billing_item_id,
              partner_id: item.partner_id,
              found_partner_billing: recurringPartnerBilling.find(pb => 
                pb.billing_source === 'partner_billing' && 
                pb.billing_item_id === item.billing_item_id
              ),
              mapped_partner_billing_id: mappedItem.partner_billing_id
            });

            console.log('📝 Final mapped item:', mappedItem);
            return mappedItem;
          })
      ],

      one_time_fees: oneTimeBillings
        .filter(item => selectedOneTimeItems.includes(item.id))
        .map(item => ({
          addl_billing_id: item.id,
          partner_id: parseInt(selectedPartner),
          partner_code: partners.find(p => p.id === parseInt(selectedPartner)).partner_code,
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

    // 5. Send to backend
    const response = await fetch(`${API_URL}/api/generate-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoiceData)
    });

    if (!response.ok) throw new Error('Failed to generate invoice');

    const result = await response.json();
    console.log('✅ Invoice generated successfully:', result);
    
    // 6. Navigate to review page
    navigate(`/invoice-review/${result.invoice_id}`);
  } catch (error) {
    console.error('❌ Error generating invoice:', error);
    alert('Failed to generate invoice. Please try again.');
  }
  
  console.groupEnd();
};

 useEffect(() => {
   console.log('🔄 Fetching partners...');
   fetch(`${API_URL}/api/partners`)
     .then(response => {
       if (!response.ok) throw new Error('Failed to fetch partners');
       return response.json();
     })
     .then(data => {
       console.log('👥 Loaded partners:', data);
       setPartners(data);
     })
     .catch(error => {
       console.error('❌ Error fetching partners:', error);
       setPartners([]);
     });
 }, []);

 useEffect(() => {
   console.log('🔄 Fetching months...');
   fetch(`${API_URL}/api/fetch-distinct-months`)
     .then(response => {
       if (!response.ok) throw new Error('Failed to fetch months');
       return response.json();
     })
     .then(data => {
       console.log('📅 Loaded months:', data);
       setMonths(data);
     })
     .catch(error => {
       console.error('❌ Error fetching months:', error);
       setMonths([]);
     });
 }, []);

 useEffect(() => {
  if (selectedPartner && selectedMonth) {
    console.log('🔄 Fetching monthly billing data...', { selectedPartner, selectedMonth });
    
    fetch(`${API_URL}/api/monthly-billing/partner/${selectedPartner}/${selectedMonth}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch monthly billing data');
        return response.json();
      })
      .then(data => {
        console.log('📊 Loaded monthly billing data:', data);
        setMonthlyData(data.length > 0 ? data : []);
      })
      .catch(error => {
        console.error('❌ Error fetching monthly billing data:', error);
        setMonthlyData([]);
      });
  }
}, [selectedPartner, selectedMonth]);

 useEffect(() => {
   if (selectedPartner && startDate && endDate) {
    console.log('🔄 Fetching one-time billings...', { selectedPartner, startDate, endDate });
    
    fetch(`${API_URL}/api/addl-billings/${selectedPartner}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch one-time billings');
        return response.json();
      })
      .then(data => {
        console.log('📊 Loaded one-time billings:', data);
        setOneTimeBillings(data);
      })
      .catch(error => {
        console.error('❌ Error fetching one-time billings:', error);
        setOneTimeBillings([]);
      });
   }
 }, [selectedPartner, startDate, endDate]);
 
const calculateTieredFee = (employeeCount) => {
  console.group('Calculate Tiered Fee Detailed Breakdown');
  console.log('Input Employee Count:', employeeCount);
  console.log('Per Employee Fee Object:', perEmployeeFee);
  console.log('Employee Tiers:', employeeTiers);

  // If no per-employee fee is set or amount is zero, return 0
  if (!perEmployeeFee || 
      (parseFloat(perEmployeeFee.amount) === 0 && 
       parseFloat(perEmployeeFee.per_employee_amount) === 0)) {
    console.log('No valid per-employee fee - Returning 0');
    console.groupEnd();
    return 0;
  }

  // If no tiers are defined, use flat rate
  if (!employeeTiers.length) {
    const feeAmount = parseFloat(perEmployeeFee.per_employee_amount) || 
                     parseFloat(perEmployeeFee.amount) || 0;
    const flatRateFee = Number((employeeCount * feeAmount).toFixed(2));
    console.log('No tiers defined - Using flat rate', {
      employeeCount,
      feeAmount,
      flatRateFee
    });
    console.groupEnd();
    return flatRateFee;
  }

  // Sort tiers to ensure correct processing
  const sortedTiers = [...employeeTiers].sort((a, b) => a.tier_min - b.tier_min);
  
  // Find the applicable tier based on employee count
  const applicableTier = sortedTiers.find(tier => 
    employeeCount >= parseInt(tier.tier_min) && 
    employeeCount <= parseInt(tier.tier_max)
  );

  if (!applicableTier) {
    console.log('No applicable tier found - Using highest tier');
    // If count exceeds all tiers, use the highest tier
    const highestTier = sortedTiers[sortedTiers.length - 1];
    const totalFee = Number((employeeCount * parseFloat(highestTier.per_employee_rate)).toFixed(2));
    console.log('Fee calculation:', {
      employeeCount,
      rate: highestTier.per_employee_rate,
      totalFee
    });
    console.groupEnd();
    return totalFee;
  }

  // Calculate fee using the applicable tier rate for all employees
  const totalFee = Number((employeeCount * parseFloat(applicableTier.per_employee_rate)).toFixed(2));
  
  console.log('Fee calculation:', {
    employeeCount,
    applicableTier,
    rate: applicableTier.per_employee_rate,
    totalFee
  });
  console.groupEnd();
  return totalFee;
};

// Add new utility functions at the top
const aggregateMonthlyData = (monthlyData) => {
  console.log('🔄 Aggregating monthly data...');
  return monthlyData.reduce((acc, current) => {
    const existing = acc.find(item => item.client_code === current.client_code);
    
    if (existing) {
      console.log(`📊 Combining records for client ${current.client_code}`);
      existing.total_active_employees += current.total_active_employees;
      existing.total_employees_paid += current.total_employees_paid;
      existing.is_pay_group_active = existing.is_pay_group_active || current.is_pay_group_active;
      // Keep most recent/relevant data
      existing.client_name = current.client_name;
    } else {
      acc.push({...current});
    }
    return acc;
  }, []);
};

const validateRecurringBilling = (item, monthlyData) => {
  const warnings = [];
  
  if (item.billing_source === 'client_billing' && item.per_employee_amount) {
    const monthlyEntry = monthlyData.find(m => m.client_code === item.client_id);
    if (!monthlyEntry) {
      warnings.push('Client not found in monthly billing data');
    } else if (!monthlyEntry.is_pay_group_active) {
      warnings.push('Client pay group is inactive');
    }
  }
  
  return {
    ...item,
    warnings,
    hasWarnings: warnings.length > 0
  };
};

// Add to your CSS or styled-components
const styles = {
  warning: {
    color: '#f57c00',
    fontSize: '0.8rem',
    marginTop: '4px'
  },
  override: {
    backgroundColor: '#fff3e0',
    border: '1px solid #ffb74d'
  },
  aggregated: {
    backgroundColor: '#e3f2fd',
    fontWeight: 'bold'
  }
};

// Add new useEffect for partner billing setup
useEffect(() => {
  if (selectedPartner) {
    console.log('🔄 Fetching partner billing setup...', { selectedPartner });
    
    fetch(`${API_URL}/api/partner-billing/${selectedPartner}`)
      .then(response => {
        if (!response.ok) throw new Error('Failed to fetch partner billing setup');
        return response.json();
      })
      .then(data => {
        console.log('📊 Loaded partner billing setup:', data);
        
        // Find base EIN fee
        const baseEinItem = data.find(item => item.billing_type === 'base_ein');
        if (baseEinItem) {
          console.log('💰 Found base EIN fee:', baseEinItem);
          setBaseFee(baseEinItem);
        }
        
        // Find per-employee fee
        const perEmployeeItem = data.find(item => item.billing_type === 'per_employee');
        if (perEmployeeItem) {
          console.log('👥 Found per-employee fee:', perEmployeeItem);
          setPerEmployeeFee(perEmployeeItem);
          
          // Fetch tiers if it exists
          fetch(`${API_URL}/api/billing-tiers/${perEmployeeItem.id}`)
            .then(response => response.json())
            .then(tiers => {
              console.log('📊 Loaded employee tiers:', tiers);
              setEmployeeTiers(tiers);
            })
            .catch(error => {
              console.error('❌ Error fetching employee tiers:', error);
              setEmployeeTiers([]);
            });
        }
        
        // Find monthly minimum fee
        const monthlyMinItem = data.find(item => item.billing_type === 'monthly_min');
        if (monthlyMinItem) {
          console.log('💵 Found monthly minimum fee:', monthlyMinItem);
          setMonthlyMinFee(monthlyMinItem);
        }
        
        // Set recurring billings
        const recurringItems = data.filter(item => 
          item.billing_type !== 'base_ein' && 
          item.billing_type !== 'per_employee' &&
          item.billing_type !== 'monthly_min'
        );
        console.log('🔄 Found recurring items:', recurringItems);
        setRecurringPartnerBilling(recurringItems);
      })
      .catch(error => {
        console.error('❌ Error fetching partner billing setup:', error);
        setBaseFee(null);
        setPerEmployeeFee(null);
        setMonthlyMinFee(null);
        setRecurringPartnerBilling([]);
        setEmployeeTiers([]);
      });
  }
}, [selectedPartner]);

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
  const selectedClients = monthlyData.filter(item => selectedMonthlyItems.includes(item.client_code));
  const partner = partners.find(p => p.id === parseInt(selectedPartner));

  // Calculate ONLY base EIN fees (not including per-employee fees)
  const totalBaseEINFeesAcrossClients = selectedClients.reduce((total, item) => {
    const isActive = item.is_pay_group_active;
    const baseAmount = isActive ? parseFloat(baseFee?.amount || 0) : 0;
    // Remove per-employee fees from this calculation
    return total + baseAmount;
  }, 0);

  const minFeeAmount = parseFloat(monthlyMinFee?.amount || 0);
  const monthlyMinBilledTotal = minFeeAmount > totalBaseEINFeesAcrossClients 
    ? (minFeeAmount - totalBaseEINFeesAcrossClients) 
    : 0;

  // Update the display to show only base fees in comparison
  return (
    <div className="billing-summary" style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
      <h4>Monthly Minimum Fee Comparison</h4>
      <p>Total Base EIN Fees Only: ${totalBaseEINFeesAcrossClients.toFixed(2)}</p>
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
  const validatedRow = validateRecurringBilling(row, monthlyData);
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
    <tr key={index} className={validatedRow.hasWarnings ? 'warning-row' : ''}>
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
      <td>
        {validatedRow.warnings.map((warning, i) => (
          <div key={i} style={styles.warning}>⚠️ {warning}</div>
        ))}
      </td>
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












