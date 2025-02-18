import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./App.css";
import axios from 'axios';

const PartnerSetup = () => {
  const navigate = useNavigate();
  const [partners, setPartners] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [editingPartner, setEditingPartner] = useState(null);
  const [showInactive, setShowInactive] = useState(false);

  // Add is_active to the state
  const [partnerCode, setPartnerCode] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [contractStartDate, setContractStartDate] = useState("");
  const [contractTermYears, setContractTermYears] = useState("1");
  const [autoRenews, setAutoRenews] = useState(false);
  const [overrideRenewalDate, setOverrideRenewalDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  const apiUrl = process.env.REACT_APP_API_URL || 'https://billing-system-api-8m6c.onrender.com';

  useEffect(() => {
    console.log('Environment variables:', {
      NODE_ENV: process.env.NODE_ENV,
      REACT_APP_API_URL: process.env.REACT_APP_API_URL,
      apiUrl: apiUrl
    });
    fetchPartners();
  }, [showInactive]); // Refetch when showInactive changes

  const fetchPartners = async () => {
    try {
      const response = await axios.get(`${apiUrl}/api/partners?showInactive=${showInactive}`);
      setPartners(response.data);
    } catch (error) {
      console.error('Error fetching partners:', error);
    }
  };

  const handleAddNew = () => {
    setEditingPartner(null);
    resetForm();
    setIsFormVisible(true);
  };

  const handleEdit = (partner) => {
    setEditingPartner(partner);
    setPartnerCode(partner.partner_code);
    setPartnerName(partner.partner_name);
    setContactName(partner.contact_name);
    setContactEmail(partner.contact_email);
    setPhoneNumber(partner.phone_number);
    setContractStartDate(partner.contract_start ? partner.contract_start.split("T")[0] : "");
    setContractTermYears(partner.contract_term.toString());
    setAutoRenews(partner.auto_renews);
    setOverrideRenewalDate(partner.override_renewal_date ? partner.override_renewal_date.split("T")[0] : "");
    setIsActive(partner.is_active);
    setIsFormVisible(true);
  };

  const resetForm = () => {
    setPartnerCode("");
    setPartnerName("");
    setContactName("");
    setContactEmail("");
    setPhoneNumber("");
    setContractStartDate("");
    setContractTermYears("1");
    setAutoRenews(false);
    setOverrideRenewalDate("");
    setIsActive(true);
  };

  const handleSave = async () => {
    const partnerData = {
      partner_code: partnerCode,
      partner_name: partnerName,
      contact_name: contactName,
      contact_email: contactEmail,
      phone_number: phoneNumber,
      contract_start: contractStartDate || null,
      contract_term: parseInt(contractTermYears),
      auto_renews: autoRenews,
      override_renewal_date: overrideRenewalDate || null,
      is_active: isActive,
    };

    try {
      const response = await axios.post(`${apiUrl}/api/partners`, partnerData);
      setIsFormVisible(false);
      resetForm();
      fetchPartners();
    } catch (error) {
      console.error('Error saving partner:', error);
    }
  };

  return (
    <div className="container">
      <h2>Partner Management</h2>

      <button className="back-button" onClick={() => navigate("/")}>
        Back to Main Menu
      </button>

      <div className="controls-container">
        <input
          type="text"
          placeholder="Search for a partner..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-bar"
        />

        <div className="filter-controls">
          <label className="show-inactive-label">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Show Inactive Partners
          </label>
        </div>

        <button className="add-button" onClick={handleAddNew}>
          {isFormVisible ? 'Hide Form' : 'Add New Partner'}
        </button>
      </div>

      {/* Form moved here, above the table */}
      {isFormVisible && (
        <div className="partner-form-container">
          <div className="partner-form">
            <h3>{editingPartner ? "Edit Partner" : "Add New Partner"}</h3>
            <div className="form-grid">
              <div className="form-column">
                <label>Partner Code:</label>
                <input value={partnerCode} onChange={(e) => setPartnerCode(e.target.value)} />
                
                <label>Partner Name:</label>
                <input value={partnerName} onChange={(e) => setPartnerName(e.target.value)} />
                
                <label>Contact Name:</label>
                <input value={contactName} onChange={(e) => setContactName(e.target.value)} />
                
                <label>Contact Email:</label>
                <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
              </div>
              
              <div className="form-column">
                <label>Phone Number:</label>
                <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
                
                <label>Contract Start Date:</label>
                <input
                  type="date"
                  value={contractStartDate}
                  onChange={(e) => setContractStartDate(e.target.value)}
                />
                
                <label>Contract Term (Years):</label>
                <select value={contractTermYears} onChange={(e) => setContractTermYears(e.target.value)}>
                  <option value="1">1 Year</option>
                  <option value="2">2 Years</option>
                  <option value="3">3 Years</option>
                </select>
                
                <label>Override Renewal Date:</label>
                <input
                  type="date"
                  value={overrideRenewalDate}
                  onChange={(e) => setOverrideRenewalDate(e.target.value)}
                />
              </div>
              
              <div className="form-column">
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={autoRenews}
                      onChange={(e) => setAutoRenews(e.target.checked)}
                    />
                    Auto Renews
                  </label>
                </div>
                
                <div className="checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                    />
                    Active
                  </label>
                </div>
                
                <div className="form-buttons">
                  <button onClick={handleSave}>Save</button>
                  <button onClick={() => {
                    setIsFormVisible(false);
                    resetForm();
                  }}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <table className="partner-table">
        <thead>
          <tr>
            <th>Partner Code</th>
            <th>Partner Name</th>
            <th>Main Contact</th>
            <th>Phone</th>
            <th>Email</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {partners.length > 0 ? (
            partners
              .filter((partner) =>
                partner.partner_name.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .map((partner) => (
                <tr key={partner.id} className={!partner.is_active ? 'inactive-row' : ''}>
                  <td>{partner.partner_code}</td>
                  <td>{partner.partner_name}</td>
                  <td>{partner.contact_name}</td>
                  <td>{partner.phone_number}</td>
                  <td>{partner.contact_email}</td>
                  <td>{partner.is_active ? 'Active' : 'Inactive'}</td>
                  <td>
                    <button onClick={() => handleEdit(partner)}>Edit</button>
                    <button
                      onClick={() => navigate(`/partner-billing/${partner.id}`)}
                      className="billing-button"
                      disabled={!partner.is_active}
                    >
                      Manage Billing
                    </button>
                    <button
                      onClick={() => navigate(`/client-billing/${partner.id}`)}
                      className="client-button"
                      disabled={!partner.is_active}
                    >
                      Manage Clients
                    </button>
                  </td>
                </tr>
              ))
          ) : (
            <tr>
              <td colSpan="7">No partners found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default PartnerSetup;

















