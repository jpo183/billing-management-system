import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import "./App.css";

const Reporting = () => {
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedPartner, setSelectedPartner] = useState('');
  const [billingData, setBillingData] = useState([]);
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [months, setMonths] = useState([]);
  const [partners, setPartners] = useState([]);
  const [activeReport, setActiveReport] = useState('monthlyData');
  const navigate = useNavigate();

  useEffect(() => {
    fetch("http://localhost:5050/fetch-distinct-months")
      .then((response) => response.json())
      .then((data) => setMonths(data))
      .catch(() => setMonths([]));

    fetch("http://localhost:5050/api/partners")
      .then((response) => response.json())
      .then((data) => setPartners(data))
      .catch(() => setPartners([]));
  }, []);

  useEffect(() => {
    if (selectedMonth && activeReport === 'monthlyData') {
      fetch(`http://localhost:5050/monthly-billing/${selectedMonth}`)
        .then((response) => response.json())
        .then((data) => setBillingData(data))
        .catch(() => setBillingData([]));
    }
  }, [selectedMonth, activeReport]);

  useEffect(() => {
    if (selectedPartner && selectedMonth && activeReport === 'partnerMonthlyData') {
      const partner = partners.find(p => p.id === parseInt(selectedPartner));
      console.log('Selected partner:', partner);
      console.log('Selected month:', selectedMonth);
      if (partner?.partner_code) {
        const url = `http://localhost:5050/monthly-billing/partner/${partner.partner_code}/${selectedMonth}`;
        console.log('Fetching URL:', url);
        fetch(url)
          .then(response => {
            console.log('Response status:', response.status);
            return response.json();
          })
          .then(data => {
            console.log('Received data:', data);
            setBillingData(data);
          })
          .catch(error => {
            console.error('Error:', error);
            setBillingData([]);
          });
      }
    }
  }, [selectedPartner, selectedMonth, activeReport, partners]);

 useEffect(() => {
  if (selectedPartner && activeReport === 'partnerInfo') {
    console.log('Fetching partner details for:', selectedPartner);
    fetch(`http://localhost:5050/api/partners/${selectedPartner}/details`)
      .then((response) => {
        console.log('Partner details response:', response.status);
        return response.json();
      })
      .then((data) => {
        console.log('Partner details data:', data);
        setPartnerInfo(data);
      })
      .catch((error) => {
        console.error('Error fetching partner details:', error);
        setPartnerInfo(null);
      });
  }
}, [selectedPartner, activeReport]);

  useEffect(() => {
    if (selectedPartner && activeReport === 'partnerAdditional') {
      const partner = partners.find(p => p.id === parseInt(selectedPartner));
      if (partner?.id) {
        fetch(`http://localhost:5050/api/addl-billings/${partner.id}`)
          .then(response => response.json())
          .then(data => setBillingData(data))
          .catch(error => {
            console.error('Error:', error);
            setBillingData([]);
          });
      }
    }
  }, [selectedPartner, activeReport, partners]);

  const handlePartnerChange = (e) => {
    setSelectedPartner(e.target.value);
  };

  return (
    <div className="container">
      <h2>Billing Reports</h2>

      <button className="button back-button" onClick={() => navigate("/")}>Back to Main Menu</button>

      <div className="submenu">
        <button className={`submenu-button ${activeReport === 'monthlyData' ? 'active' : ''}`} onClick={() => setActiveReport('monthlyData')}>
          Monthly Data
        </button>
        <button className={`submenu-button ${activeReport === 'partnerMonthlyData' ? 'active' : ''}`} onClick={() => setActiveReport('partnerMonthlyData')}>
          Partner Monthly Data
        </button>
        <button className={`submenu-button ${activeReport === 'partnerAdditional' ? 'active' : ''}`} onClick={() => setActiveReport('partnerAdditional')}>
          Partner Additional Billings
        </button>
        <button className={`submenu-button ${activeReport === 'partnerInfo' ? 'active' : ''}`} onClick={() => setActiveReport('partnerInfo')}>
          Partner Information
        </button>
      </div>

      {(activeReport === 'monthlyData' || activeReport === 'partnerMonthlyData') && (
        <select 
          value={selectedMonth} 
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="month-select"
        >
          <option value="">-- Select a Month --</option>
          {months.map((month) => (
            <option key={month} value={month}>{month}</option>
          ))}
        </select>
      )}

      {(activeReport === 'partnerMonthlyData' || activeReport === 'partnerInfo' || activeReport === 'partnerAdditional') && (
        <select 
          value={selectedPartner} 
          onChange={handlePartnerChange}
          className="partner-select"
        >
          <option value="">-- Select a Partner --</option>
          {partners.map((partner) => (
            <option key={partner.id} value={partner.id}>{partner.partner_name}</option>
          ))}
        </select>
      )}

      {billingData.length > 0 && activeReport === 'monthlyData' && (
        <table className="reporting-table">
          <thead>
            <tr>
              <th>Total Employees Paid</th>
              <th>Total Active Employees</th>
              <th>FEIN</th>
              <th>Client Code</th>
              <th>Client Name</th>
            </tr>
          </thead>
          <tbody>
            {billingData.map((row, index) => (
              <tr key={index}>
                <td>{row.total_employees_paid}</td>
                <td>{row.total_active_employees}</td>
                <td>{row.fein}</td>
                <td>{row.client_code}</td>
                <td>{row.client_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {billingData.length > 0 && activeReport === 'partnerMonthlyData' && (
        <table className="reporting-table">
          <thead>
            <tr>
              <th>Total Employees Paid</th>
              <th>Total Active Employees</th>
              <th>FEIN</th>
              <th>Client Code</th>
              <th>Client Name</th>
            </tr>
          </thead>
          <tbody>
            {billingData.map((row, index) => (
              <tr key={index}>
                <td>{row.total_employees_paid}</td>
                <td>{row.total_active_employees}</td>
                <td>{row.fein}</td>
                <td>{row.client_code}</td>
                <td>{row.client_name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {billingData.length > 0 && activeReport === 'partnerAdditional' && (
        <table className="reporting-table">
          <thead>
            <tr>
              <th>Client Name</th>
              <th>Item Name</th>
              <th>Amount</th>
              <th>Billing Date</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            {billingData.map((row, index) => (
              <tr key={index}>
                <td>{row.client_name}</td>
                <td>{row.item_name}</td>
                <td>${parseFloat(row.amount).toFixed(2)}</td>
                <td>{new Date(row.billing_date).toLocaleDateString()}</td>
                <td>{row.description || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {activeReport === 'partnerInfo' && partnerInfo && (
        <div className="partner-info">
          <h3>Partner Details</h3>
          <p><strong>Name:</strong> {partnerInfo.partner_name}</p>
          <p><strong>Contact:</strong> {partnerInfo.contact_name} ({partnerInfo.contact_email})</p>
          <p><strong>Phone:</strong> {partnerInfo.phone_number}</p>
          <p><strong>Contract Start:</strong> {partnerInfo.contract_start}</p>
          <p><strong>Contract Term:</strong> {partnerInfo.contract_term}</p>
          
          <h3>Partner Billing Items</h3>
          {partnerInfo.billing_items && partnerInfo.billing_items.length > 0 ? (
            <table className="reporting-table">
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Amount</th>
                  <th>Frequency</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {partnerInfo.billing_items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.item_name}</td>
                    <td>${parseFloat(item.amount).toFixed(2)}</td>
                    <td>{item.billing_frequency}</td>
                    <td>{new Date(item.start_date).toLocaleDateString()}</td>
                    <td>{item.end_date ? new Date(item.end_date).toLocaleDateString() : 'N/A'}</td>
                    <td>{item.is_active ? 'Active' : 'Inactive'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No billing items found for this partner.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Reporting;















