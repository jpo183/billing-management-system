import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || 'https://billing-system-api-8m6c.onrender.com';

const UnfinalizedInvoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchInvoices = async () => {
      console.log('🔄 Fetching unfinalized invoices...');
      try {
        const response = await fetch(`${API_URL}/api/invoices/draft`);
        if (!response.ok) {
          throw new Error('Failed to fetch invoices');
        }
        const data = await response.json();
        console.log('📊 Loaded unfinalized invoices:', data);
        setInvoices(data);
        setError(null);
      } catch (error) {
        console.error('❌ Error fetching invoices:', error);
        setError('Failed to load invoices. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  if (loading) return <div>Loading invoices...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="container">
      <h2>Unfinalized Invoices</h2>
      <button className="back-button" onClick={() => navigate("/")}>
        Back to Main Menu
      </button>
      
      {invoices.length === 0 ? (
        <p>No unfinalized invoices found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Partner Name</th>
              <th>Invoice Month</th>
              <th>Invoice Date</th>
              <th>Total Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoice_number}</td>
                <td>{invoice.partner_name}</td>
                <td>{invoice.invoice_month}</td>
                <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                <td>
                  ${typeof invoice.total_amount === 'number' 
                    ? invoice.total_amount.toFixed(2) 
                    : parseFloat(invoice.total_amount || 0).toFixed(2)}
                </td>
                <td>{invoice.status}</td>
                <td>
                  <button
                    className="review-button"
                    onClick={() => {
                      const invoiceId = invoice.id;
                      console.log('Attempting to navigate to invoice:', invoiceId);
                      if (invoiceId) {
                        navigate(`/invoice-review/${invoiceId}`);
                      } else {
                        console.error('No invoice ID available');
                      }
                    }}
                  >
                    Review
                  </button>
                  <button
                    className="void-button"
                    onClick={async () => {
                      if (window.confirm('Are you sure you want to void this invoice?')) {
                        try {
                          const response = await fetch(
                            `${API_URL}/api/invoices/${invoice.id}/void`,
                            { method: 'POST' }
                          );
                          if (!response.ok) throw new Error('Failed to void invoice');
                          // Refresh the list
                          setInvoices(invoices.filter(inv => inv.id !== invoice.id));
                        } catch (error) {
                          console.error('Failed to void invoice:', error);
                          alert('Failed to void invoice. Please try again.');
                        }
                      }
                    }}
                  >
                    Void
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default UnfinalizedInvoices;
