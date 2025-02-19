import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./InvoicePrint.css";
import LogoImage from './PWX logo.jpg'; 

// Add API_URL constant
const API_URL = process.env.REACT_APP_API_URL || 'https://billing-system-api-8m6c.onrender.com';

const InvoicePrint = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [monthlyBillingData, setMonthlyBillingData] = useState([]);
  const [recurringBillingData, setRecurringBillingData] = useState([]);
  const [oneTimeBillingData, setOneTimeBillingData] = useState([]);

  useEffect(() => {
    const fetchInvoice = async () => {
      console.log('🔍 Fetching invoice details for ID:', invoiceId);
      try {
        const response = await fetch(`${API_URL}/api/invoices/${invoiceId}`);
        const data = await response.json();
        console.log('✅ Invoice data received:', data);
        setInvoice(data);
      } catch (error) {
        console.error("❌ Error fetching invoice:", error);
      }
    };

    const fetchBillingData = async () => {
      console.log('🔍 Fetching billing data...');
      try {
        // Fetch monthly billing data
        const monthlyResponse = await fetch(`${API_URL}/api/invoices/${invoiceId}/monthly`);
        const monthlyData = await monthlyResponse.json();
        console.log('📊 Monthly billing data:', monthlyData);
        setMonthlyBillingData(monthlyData);

        // Fetch recurring billing data
        const recurringResponse = await fetch(`${API_URL}/api/invoices/${invoiceId}/recurring`);
        const recurringData = await recurringResponse.json();
        console.log('🔄 Recurring billing data:', recurringData);
        setRecurringBillingData(recurringData);

        // Fetch one-time billing data
        const oneTimeResponse = await fetch(`${API_URL}/api/invoices/${invoiceId}/onetime`);
        const oneTimeData = await oneTimeResponse.json();
        console.log('1️⃣ One-time billing data:', oneTimeData);
        setOneTimeBillingData(oneTimeData);
      } catch (error) {
        console.error("❌ Error fetching billing data:", error);
      }
    };

    fetchInvoice();
    fetchBillingData();
  }, [invoiceId]);

  const handlePrint = () => {
    window.print();
  };

  if (!invoice) return <div>Loading invoice...</div>;
  
  const monthlyTotals = {
  baseFeeTotal: monthlyBillingData.reduce((sum, item) => sum + Number(item.base_fee_amount || 0), 0),
  perEmployeeFeeTotal: monthlyBillingData.reduce((sum, item) => sum + Number(item.per_employee_fee_amount || 0), 0),
  total: monthlyBillingData.reduce((sum, item) => sum + Number(item.total_monthly_fee || 0), 0)
};

 
  return (
   <div className="invoice-container">
      <div className="invoice-header">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start', 
          marginBottom: '20px' ,
          marginRight: '20px'
        }}>
        
         <div className="invoice-buttons no-print">
        <button onClick={handlePrint} className="print-button">Print Invoice</button>
        <button onClick={() => navigate("/finalized-invoices")} className="back-button">
          Back to Finalized Invoices
        </button>
      </div>
          <div style={{ textAlign: 'left' }}>
            <h2>Invoice {invoice.invoice_number}</h2>
            <p><strong>Partner:</strong> {invoice.partner_name}</p>
            <p><strong>Date:</strong> {new Date(invoice.invoice_date).toLocaleDateString()}</p>
            <p><strong>Status:</strong> {invoice.status}</p>
          </div>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            textAlign: 'center' 
          }}>
            <img 
              src={LogoImage} 
              alt="PeopleWorX Logo" 
              style={{ 
                maxWidth: '100px', 
                marginBottom: '10px' 
              }} 
            />
            <h2>PeopleWorX</h2>
            <p>1-888-929-2729</p>
            <p>www.PeopleWorX.io</p>
          </div>
        </div>
      </div>

{/* Summary Table */}
<table className="summary-table">
  <tbody>
    <tr>
      <td>Total Monthly Fees</td>
      <td>${invoice.monthly_fees
        .filter(fee => fee.is_pay_group_active)
        .reduce((sum, fee) => {
          const baseFee = parseFloat(fee.base_fee_amount || 0);
          const perEmployeeFee = parseFloat(fee.per_employee_fee_amount || 0);
          return sum + baseFee + perEmployeeFee;
        }, 0)
        .toFixed(2)}</td>
    </tr>
    <tr>
      <td>Recurring Fees</td>
      <td>${invoice.recurring_fees
        .reduce((sum, fee) => sum + parseFloat(fee.invoiced_amount || 0), 0)
        .toFixed(2)}</td>
    </tr>
    <tr>
      <td>One-Time Fees</td>
      <td>${invoice.one_time_fees
        .reduce((sum, fee) => sum + parseFloat(fee.invoiced_amount || 0), 0)
        .toFixed(2)}</td>
    </tr>
    <tr>
      <td><strong>Total Invoice Amount</strong></td>
      <td><strong>${invoice.total_amount}</strong></td>
    </tr>
  </tbody>
</table>

{/* Monthly Billing Section */}
<div className="billing-section">
  <h3>Supporting Monthly Billing Data</h3>
  {invoice.monthly_fees?.filter(fee => fee.is_pay_group_active)?.length > 0 ? (
    <table>
      <thead>
        <tr>
          <th>Client Name</th>
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

            return (
              <tr key={index}>
                <td>{fee.client_name}</td>
                <td>${fee.base_fee_amount}</td>
                <td>${fee.per_employee_fee_amount}</td>
                <td>${total.toFixed(2)}</td>
              </tr>
            );
          })}
      </tbody>
      <tfoot>
        <tr>
          <td colSpan="3"><strong>Monthly Subtotal:</strong></td>
          <td><strong>${invoice.monthly_fees
            .filter(fee => fee.is_pay_group_active)
            .reduce((sum, fee) => {
              const baseFee = parseFloat(fee.base_fee_amount || 0);
              const perEmployeeFee = parseFloat(fee.per_employee_fee_amount || 0);
              return sum + baseFee + perEmployeeFee;
            }, 0)
            .toFixed(2)}</strong></td>
        </tr>
      </tfoot>
    </table>
  ) : (
    <p>No active monthly fees</p>
  )}
</div>

      {/* Recurring Billing Section */}
      <div className="billing-section">
        <h3>Supporting Recurring Billing Data</h3>
        {recurringBillingData.length === 0 ? (
          <p>No supporting recurring billing data available.</p>
        ) : (
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
              {recurringBillingData.map((billing, index) => (
                <tr key={index}>
                  <td>{billing.client_name || "N/A"}</td>
                  <td>{billing.item_name}</td>
                  <td>${Number(billing.original_amount || 0).toFixed(2)}</td>
                  <td>${Number(billing.invoiced_amount || 0).toFixed(2)}</td>
                  <td>{billing.override_reason || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* One-Time Billing Section */}
      <div className="billing-section">
        <h3>Supporting One-Time Billing Data</h3>
        {oneTimeBillingData.length === 0 ? (
          <p>No supporting one-time billing data available.</p>
        ) : (
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
              {oneTimeBillingData.map((billing, index) => (
                <tr key={index}>
                  <td>{billing.client_name || "N/A"}</td>
                  <td>{billing.item_name}</td>
                  <td>${Number(billing.original_amount || 0).toFixed(2)}</td>
                  <td>${Number(billing.invoiced_amount || 0).toFixed(2)}</td>
                  <td>{billing.override_reason || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

     
    </div>
  );
};

export default InvoicePrint;
