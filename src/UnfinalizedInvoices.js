import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const UnfinalizedInvoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoices = async () => {
      try {
        const response = await fetch("http://localhost:5050/api/invoices/draft");
        const data = await response.json();
        setInvoices(data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching invoices:", error);
        setLoading(false);
      }
    };

    fetchInvoices();
  }, []);

  if (loading) return <div>Loading invoices...</div>;

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
              <th>Invoice Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoice_number}</td>
                <td>{invoice.partner_name}</td>
                <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                <td>{invoice.status}</td>
                <td>
                  <button
                    onClick={() => navigate(`/invoice-review/${invoice.id}`)}
                  >
                    Review
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
