import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './App.css';

const InvoiceReview = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [monthlyBillings, setMonthlyBillings] = useState([]);
  const [recurringBillings, setRecurringBillings] = useState([]);
  const [oneTimeBillings, setOneTimeBillings] = useState([]);
  const [loading, setLoading] = useState(true);

 useEffect(() => {
  const fetchInvoiceData = async () => {
    try {
      const masterResponse = await fetch(`http://localhost:5050/api/invoice/${invoiceId}`);
      
      if (!masterResponse.ok) {
        if (masterResponse.status === 404) {
          console.error("Invoice not found");
          setInvoice(null);
          return;
        }
        throw new Error(`Error fetching invoice: ${masterResponse.statusText}`);
      }

      const masterData = await masterResponse.json();
      setInvoice(masterData);

      // Fetch monthly billings
      const monthlyResponse = await fetch(`http://localhost:5050/api/invoice/${invoiceId}/monthly`);
      const monthlyData = await monthlyResponse.json();
      
      // Fetch recurring billings
      const recurringResponse = await fetch(`http://localhost:5050/api/invoice/${invoiceId}/recurring`);
      const recurringData = await recurringResponse.json();
      
      // Fetch one-time billings
      const oneTimeResponse = await fetch(`http://localhost:5050/api/invoice/${invoiceId}/onetime`);
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
      setLoading(false);
      
    } catch (error) {
      console.error("Error fetching invoice data:", error);
      setInvoice(null);
      setLoading(false);
    }
  };

  fetchInvoiceData();
}, [invoiceId]);


  const handleStatusChange = async (newStatus) => {
    try {
      const response = await fetch(`http://localhost:5050/api/invoice/${invoiceId}/status`, {
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

  if (loading) return <div>Loading invoice data...</div>;
  if (!invoice) return <div>Invoice not found</div>;

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
  <button className="back-button" onClick={() => navigate("/")}>
    Back to Main Menu
  </button>
  <button className="back-button" onClick={() => navigate("/unfinalized-invoices")}>
    Back to Unfinalized Review Page
  </button>
  <button className="back-button" onClick={() => navigate("/finalized-invoices")}>
    Go to Finalized Invoices
  </button>


      {/* Invoice Header */}
      <div className="invoice-header">
        <h3>Invoice #{invoice.invoice_number}</h3>
        <p>Partner: {invoice.partner_name}</p>
        <p>Date: {new Date(invoice.invoice_date).toLocaleDateString()}</p>
        <p>Status: {invoice.status}</p>
      </div>

{/* Monthly Billings Section */}
<div className="billing-section">
  <h3>Monthly Billings</h3>
  {monthlyBillings.length === 0 ? (
    <p>No monthly billing data available.</p>
  ) : (
    <table>
      <thead>
        <tr>
          <th>Client Name</th>
          <th>Base Fee</th>
          <th>Per Employee Fee</th>
          <th>Total Fee</th>
        </tr>
      </thead>
      <tbody>
        {monthlyBillings.map((billing, index) => {
          // Ensure numbers are valid before calling .toFixed(2)
          const baseFee = Number(billing.base_fee_amount || 0).toFixed(2);
          const perEmployeeFee = Number(billing.per_employee_fee_amount || 0).toFixed(2);
          const totalFee = Number(billing.total_monthly_fee || 0).toFixed(2);

          return (
            <tr key={index}>
              <td>{billing.client_name || "N/A"}</td>
              <td>${baseFee}</td>
              <td>${perEmployeeFee}</td>
              <td>${totalFee}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot>
        <tr>
          <td><strong>Monthly Subtotal:</strong></td>
          <td><strong>${Number(totals.monthlyBaseFeeTotal || 0).toFixed(2)}</strong></td>
          <td><strong>${Number(totals.monthlyPerEmployeeFeeTotal || 0).toFixed(2)}</strong></td>
          <td><strong>${Number(totals.monthlyTotal || 0).toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    </table>
  )}
</div>


      {/* Recurring Billings Section */}
      <div className="billing-section">
        <h3>Recurring Billings</h3>
        <table>
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Item Name</th>
              <th>Original Amount</th>
              <th>Invoiced Amount</th>
              <th>Override Reason</th>
            </tr>
          </thead>
          <tbody>
            {recurringBillings.map((billing, index) => (
              <tr key={index}>
                <td>{billing.client_name}</td>
                <td>{billing.item_name}</td>
                <td>${Number(billing.original_amount).toFixed(2)}</td>
                <td>${Number(billing.invoiced_amount).toFixed(2)}</td>
                <td>{billing.override_reason || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4"><strong>Recurring Subtotal:</strong></td>
              <td><strong>${totals.recurringTotal.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* One-Time Billings Section */}
      <div className="billing-section">
        <h3>One-Time Billings</h3>
        <table>
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Item Name</th>
              <th>Original Amount</th>
              <th>Invoiced Amount</th>
              <th>Override Reason</th>
            </tr>
          </thead>
          <tbody>
            {oneTimeBillings.map((billing, index) => (
              <tr key={index}>
                <td>{billing.client_name}</td>
                <td>{billing.item_name}</td>
             <td>${Number(billing.original_amount).toFixed(2)}</td>
                <td>${Number(billing.invoiced_amount).toFixed(2)}</td>
                <td>{billing.override_reason || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan="4"><strong>One-Time Subtotal:</strong></td>
              <td><strong>${totals.oneTimeTotal.toFixed(2)}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Grand Total */}
      <div className="invoice-total">
        <h3>Grand Total: ${totals.grandTotal.toFixed(2)}</h3>
      </div>

      {/* Status Change Buttons */}
      {invoice.status === 'draft' && (
        <div className="invoice-actions">
          <button 
            className="finalize-button"
            onClick={() => handleStatusChange('final')}
          >
            Finalize Invoice
          </button>
          <button 
            className="void-button"
            onClick={() => handleStatusChange('void')}
          >
            Void Invoice
          </button>
        </div>
      )}
    </div>
  );
};

export default InvoiceReview;