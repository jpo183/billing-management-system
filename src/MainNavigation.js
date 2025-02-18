import React from "react";
import { useNavigate } from "react-router-dom";
import { logoutAndForceLogin } from './Login';
import "./App.css"; // Keep styles

const MainNavigation = () => {
  const navigate = useNavigate();

  return (
    <div className="navigation-container">
      {/* Force Re-Login Button - Positioned at Top Right */}
      <button className="logout-button top-right" onClick={logoutAndForceLogin}>
        Log Out
      </button>

      <h1 className="navigation-title">Billing System Navigation</h1>

      <button className="nav-button" onClick={() => navigate("/partner-setup")}>
        Partner Setup
      </button>
      <button className="nav-button" onClick={() => navigate("/one-time-billing")}>
        Add One Time Billing
      </button>
      <button className="nav-button" onClick={() => navigate("/monthly-billing-import")}>
        Import Monthly Billing
      </button>
      <button className="nav-button" onClick={() => navigate("/bulk-one-time-billing")}>
        Import Bulk One Time Billing
      </button>
      <button className="nav-button" onClick={() => navigate("/reporting")}>
        Reporting
      </button>
      <button className="nav-button" onClick={() => navigate("/billing-items")}>
        Billing Items
      </button>
      <button className="nav-button" onClick={() => navigate("/generate-invoice")}>
        Generate Invoice
      </button>
      <button className="nav-button" onClick={() => navigate("/unfinalized-invoices")}>
        Unfinalized Invoices
      </button>
      <button className="nav-button" onClick={() => navigate("/finalized-invoices")}>
        Finalized Invoices
      </button>
      <button className="nav-button" onClick={() => navigate("/user-management")}>
        User Management
      </button>
    </div>
  );
};

export default MainNavigation;


