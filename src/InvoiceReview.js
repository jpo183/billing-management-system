import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'https://billing-system-api-8m6c.onrender.com';

const InvoiceReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [monthlyBillings, setMonthlyBillings] = useState([]);
  const [recurringBillings, setRecurringBillings] = useState([]);
  const [oneTimeBillings, setOneTimeBillings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoiceData = async () => {
      if (!id) {
        console.error('No invoice ID provided');
        setError('Invalid invoice ID');
        setLoading(false);
        return;
      }

      try {
        console.log('🔄 Fetching invoice details for ID:', id);
        const response = await fetch(`${API_URL}/api/invoices/${id}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server error:', errorData);
          throw new Error(errorData.error || 'Failed to fetch invoice data');
        }
        
        const data = await response.json();
        console.log('📊 Loaded invoice data:', data);
        
        if (!data) {
          throw new Error('No invoice data received');
        }

        setInvoice(data);
        setError(null);

        // Fetch monthly billings
        const monthlyResponse = await fetch(`${API_URL}/api/invoices/${id}/monthly`);
        const monthlyData = await monthlyResponse.json();
        
        // Fetch recurring billings
        const recurringResponse = await fetch(`${API_URL}/api/invoices/${id}/recurring`);
        const recurringData = await recurringResponse.json();
        
        // Fetch one-time billings
        const oneTimeResponse = await fetch(`${API_URL}/api/invoices/${id}/onetime`);
        const oneTimeData = await oneTimeResponse.json();

        console.log('Monthly Billings:', monthlyData);
        console.log('Recurring Billings:', recurringData);
        console.log('One-Time Billings:', oneTimeData);

        // Add subtotal verification
        const subtotals = {
          monthly: monthlyData.reduce((sum, item) => sum + parseFloat(item.total_monthly_fee || 0), 0),
          recurring: recurringData.reduce((sum, item) => sum + parseFloat(item.invoiced_amount || 0), 0),
          oneTime: oneTimeData.reduce((sum, item) => sum + parseFloat(item.invoiced_amount || 0), 0)
        };
        console.log('Calculated Subtotals:', subtotals);

        setMonthlyBillings(monthlyData);
        setRecurringBillings(recurringData);
        setOneTimeBillings(oneTimeData);
      } catch (error) {
        console.error('❌ Error fetching invoice data:', error);
        setError(error.message || 'Failed to load invoice data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoiceData();
  }, [id, API_URL]);

  const handleStatusChange = async (newStatus) => {
    try {
      const response = await fetch(`${API_URL}/api/invoices/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) throw new Error('Failed to update status');

      // Refresh invoice data
      const updatedInvoice = await response.json();
      setInvoice(updatedInvoice);
    } catch (error) {
      console.error('Error updating invoice status:', error);
      alert('Failed to update invoice status');
    }
  };

  const handleFinalize = async () => {
    try {
      const response = await fetch(`${API_URL}/api/invoices/${id}/finalize`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to finalize invoice');
      }
      
      navigate('/unfinalized-invoices');
    } catch (error) {
      console.error('Failed to finalize invoice:', error);
      alert('Failed to finalize invoice. Please try again.');
    }
  };

  if (loading) return <div>Loading invoice details...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!invoice) return <div>No invoice found</div>;

  const calculateSubtotals = () => {
    const monthlyBaseFeeTotal = monthlyBillings.reduce((sum, item) => 
      sum + parseFloat(item.base_fee_amount || 0), 0);
    
    const monthlyPerEmployeeFeeTotal = monthlyBillings.reduce((sum, item) => 
      sum + parseFloat(item.per_employee_fee_amount || 0), 0);
    
    const monthlyTotal = monthlyBillings.reduce((sum, item) => 
      sum + parseFloat(item.total_monthly_fee || 0), 0);
    
    const recurringTotal = recurringBillings.reduce((sum, item) => 
      sum + parseFloat(item.invoiced_amount || 0), 0);
    
    const oneTimeTotal = oneTimeBillings.reduce((sum, item) => 
      sum + parseFloat(item.invoiced_amount || 0), 0);

    // Ensure everything is properly rounded to 2 decimal places
    return {
      monthlyBaseFeeTotal: Number(monthlyBaseFeeTotal.toFixed(2)),
      monthlyPerEmployeeFeeTotal: Number(monthlyPerEmployeeFeeTotal.toFixed(2)),
      monthlyTotal: Number(monthlyTotal.toFixed(2)),
      recurringTotal: Number(recurringTotal.toFixed(2)),
      oneTimeTotal: Number(oneTimeTotal.toFixed(2)),
      grandTotal: Number((monthlyTotal + recurringTotal + oneTimeTotal).toFixed(2))
    };
  };
  const totals = calculateSubtotals();

  return (
    <div className="container">
      <h2>Invoice Review</h2>
      <button className="back-button" onClick={() => navigate("/unfinalized-invoices")}>
        Back to Invoices
      </button>

      <div className="invoice-header">
        <h3>Invoice #{invoice.invoice_number}</h3>
        <p>Partner: {invoice.partner_name}</p>
        <p>Date: {new Date(invoice.invoice_date).toLocaleDateString()}</p>
        <p>Status: {invoice.status}</p>
      </div>

      {/* Monthly Fees Section */}
      <h3>Monthly Fees</h3>
      {invoice.monthly_fees?.filter(fee => fee.is_pay_group_active)?.length > 0 ? (
        <>
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Base Fee</th>
                <th>Per Employee Fee</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.monthly_fees
                .filter(fee => fee.is_pay_group_active)
                .map((fee, index) => {
                  const baseFee = parseFloat(fee.base_fee_amount || 0);
                  const perEmployeeFee = parseFloat(fee.per_employee_fee_amount || 0);
                  const total = baseFee + perEmployeeFee;
                  
                  console.log(`Monthly Fee for ${fee.client_name}:`, {
                    baseFee,
                    perEmployeeFee,
                    total,
                    isActive: fee.is_pay_group_active
                  });
                  
                  return (
                    <tr key={index}>
                      <td>{fee.client_name}</td>
                      <td>${baseFee.toFixed(2)}</td>
                      <td>${perEmployeeFee.toFixed(2)}</td>
                      <td>${total.toFixed(2)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
          <div className="section-subtotal">
            {(() => {
              const subtotal = invoice.monthly_fees
                .filter(fee => fee.is_pay_group_active)
                .reduce((sum, fee) => {
                  const total = parseFloat(fee.base_fee_amount || 0) + 
                               parseFloat(fee.per_employee_fee_amount || 0);
                  console.log(`Adding to monthly subtotal for ${fee.client_name}:`, total);
                  return sum + total;
                }, 0);
              
              console.log('Final monthly subtotal:', subtotal);
              return `Monthly Fees Subtotal: $${subtotal.toFixed(2)}`;
            })()}
          </div>
        </>
      ) : <p>No active monthly fees</p>}

      {/* Recurring Fees Section */}
      <h3>Recurring Fees</h3>
      {invoice.recurring_fees?.length > 0 ? (
        <>
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Item</th>
                <th>Original Amount</th>
                <th>Invoiced Amount</th>
                <th>Override Reason</th>
              </tr>
            </thead>
            <tbody>
              {invoice.recurring_fees.map((fee, index) => {
                const originalAmount = parseFloat(fee.original_amount || 0);
                const invoicedAmount = parseFloat(fee.invoiced_amount || 0);
                
                return (
                  <tr key={index}>
                    <td>{fee.client_name}</td>
                    <td>
                      {fee.item_name}
                      {fee.item_name === "Base Monthly Minimum" && (
                        <div className="fee-note">
                          (Monthly Minimum Fee)
                        </div>
                      )}
                    </td>
                    <td>${originalAmount.toFixed(2)}</td>
                    <td>${invoicedAmount.toFixed(2)}</td>
                    <td>{fee.override_reason || 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="section-subtotal">
            Recurring Fees Subtotal: ${invoice.recurring_fees.reduce((sum, fee) => 
              sum + parseFloat(fee.invoiced_amount || 0), 0
            ).toFixed(2)}
          </div>
        </>
      ) : <p>No recurring fees</p>}

      {/* One-Time Fees Section */}
      <h3>One-Time Fees</h3>
      {invoice.one_time_fees?.length > 0 ? (
        <>
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Item</th>
                <th>Original Amount</th>
                <th>Invoiced Amount</th>
                <th>Override Reason</th>
              </tr>
            </thead>
            <tbody>
              {invoice.one_time_fees.map((fee, index) => {
                const originalAmount = parseFloat(fee.original_amount || 0);
                const invoicedAmount = parseFloat(fee.invoiced_amount || 0);
                
                return (
                  <tr key={index}>
                    <td>{fee.client_name}</td>
                    <td>{fee.item_name}</td>
                    <td>${originalAmount.toFixed(2)}</td>
                    <td>${invoicedAmount.toFixed(2)}</td>
                    <td>{fee.override_reason || 'N/A'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="section-subtotal">
            One-Time Fees Subtotal: ${invoice.one_time_fees.reduce((sum, fee) => 
              sum + parseFloat(fee.invoiced_amount || 0), 0
            ).toFixed(2)}
          </div>
        </>
      ) : <p>No one-time fees</p>}

      <div className="invoice-total">
        <h3>Total Amount: ${parseFloat(invoice.total_amount).toFixed(2)}</h3>
      </div>

      <button 
        className="finalize-button"
        onClick={handleFinalize}
        disabled={invoice.status !== 'draft'}
      >
        Finalize Invoice
      </button>
    </div>
  );
};

export default InvoiceReview;