import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = process.env.REACT_APP_API_URL || 'https://billing-system-api-8m6c.onrender.com';

const FinalizedInvoices = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState([]);
  const [partners, setPartners] = useState([]);
  const [selectedPartner, setSelectedPartner] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch finalized invoices initially
    fetchInvoices();

    // Fetch partners for the dropdown
    fetch(`${API_URL}/api/partners`)
      .then((response) => response.json())
      .then((data) => setPartners(data))
      .catch(() => setPartners([]));
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    let url = `${API_URL}/api/invoices/final?`;

    if (selectedPartner) {
      url += `partner_id=${selectedPartner}&`;
    }
    if (fromDate) {
      url += `from_date=${fromDate}&`;
    }
    if (toDate) {
      url += `to_date=${toDate}&`;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();
      
      // Ensure data is an array, even if it's empty or undefined
      setInvoices(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      setInvoices([]);  // Set to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = () => {
    fetchInvoices();
  };

  const handleReopenInvoice = async (invoiceId) => {
    if (!window.confirm("Are you sure you want to reopen this invoice?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/invoices/${invoiceId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "draft" }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to reopen invoice");
      }

      alert("Invoice successfully reopened!");
      
      // Remove reopened invoice from the list dynamically
      setInvoices((prev) => prev.filter((inv) => inv.id !== invoiceId));
    } catch (error) {
      console.error("Error reopening invoice:", error);
      alert(error.message);
    }
  };

  return (
    <div className="container">
      <h2>Finalized Invoices</h2>
      <button className="back-button" onClick={() => navigate("/")}>
        Back to Main Menu
      </button>

      {/* Filter Section */}
      <div className="filters">
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
          <label>From Date:</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>

        <div>
          <label>To Date:</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>

        <button className="filter-button" onClick={handleFilterChange}>
          Apply Filters
        </button>
      </div>

      {loading ? (
        <div>Loading finalized invoices...</div>
      ) : invoices.length === 0 ? (
        <p>No finalized invoices found.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Invoice Number</th>
              <th>Partner Name</th>
              <th>Invoice Date</th>
              <th>Status</th>
              <th>Monthly Total</th>
              <th>Recurring Total</th>
              <th>One-Time Total</th>
              <th>Grand Total</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td>{invoice.invoice_number}</td>
                <td>{invoice.partner_name}</td>
                <td>{new Date(invoice.invoice_date).toLocaleDateString()}</td>
                <td>{invoice.status}</td>
                <td>${(Number(invoice.monthly_total) || 0).toFixed(2)}</td>
                <td>${(Number(invoice.recurring_total) || 0).toFixed(2)}</td>
                <td>${(Number(invoice.onetime_total) || 0).toFixed(2)}</td>
                <td><strong>${(Number(invoice.grand_total) || 0).toFixed(2)}</strong></td>
                <td>
                  <button onClick={() => navigate(`/invoice-review/${invoice.id}`)}>View</button>
                  <button onClick={() => handleReopenInvoice(invoice.id)} className="reopen-button">
                    Reopen
                  </button>
                  <button onClick={() => navigate(`/invoice-print/${invoice.id}`)} className="print-button">
                    Print
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

export default FinalizedInvoices;

