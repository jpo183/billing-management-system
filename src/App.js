import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainNavigation from './MainNavigation';
import PartnerSetup from './PartnerSetup';
import OneTimeBilling from './OneTimeBilling';
import MonthlyBillingImport from './MonthlyBillingImport';
import BulkOneTimeBilling from './BulkOneTimeBilling';
import Reporting from './Reporting';
import BillingItems from './BillingItems';
import PartnerBillingSetup from './PartnerBillingSetup';
import ClientBillingSetup from './ClientBillingSetup';
import GenerateInvoice from './GenerateInvoice';
import InvoiceReview from './InvoiceReview';     
import UnfinalizedInvoices from "./UnfinalizedInvoices";
import FinalizedInvoices from "./FinalizedInvoices";
import InvoicePrint from "./InvoicePrint";
import UserManagement from "./UserManagement";
import ProtectedRoute from './ProtectedRoute';
import Login from './Login';
import ErrorBoundary from './ErrorBoundary';
import "./App.css";

function App() {
  const userRole = localStorage.getItem('userRole');

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route 
          path="/" 
          element={
            userRole 
              ? <MainNavigation /> 
              : <Navigate to="/login" replace />
          } 
        />
        <Route path="/partner-setup" element={<ProtectedRoute element={<PartnerSetup />} route="partner-setup" />} />
        <Route path="/one-time-billing" element={<ProtectedRoute element={<OneTimeBilling />} route="one-time-billing" />} />
        <Route path="/monthly-billing-import" element={<ProtectedRoute element={<MonthlyBillingImport />} route="monthly-billing-import" />} />
        <Route path="/bulk-one-time-billing" element={<ProtectedRoute element={<BulkOneTimeBilling />} route="bulk-one-time-billing" />} />
        <Route path="/reporting" element={<ProtectedRoute element={<Reporting />} route="reporting" />} />
        <Route path="/billing-items" element={<ProtectedRoute element={<BillingItems />} route="billing-items" />} />
        <Route path="/partner-billing/:partnerId" element={<ProtectedRoute element={<PartnerBillingSetup />} route="partner-setup" />} />
        <Route path="/client-billing/:partnerId" element={<ProtectedRoute element={<ClientBillingSetup />} route="partner-setup" />} />
        <Route path="/generate-invoice" element={<ProtectedRoute element={<GenerateInvoice />} route="generate-invoice" />} />
        <Route 
          path="/invoice-review/:id" 
          element={
            <ProtectedRoute 
              element={<InvoiceReview />} 
              route="generate-invoice"
            />
          } 
        />
        <Route path="/unfinalized-invoices" element={<ProtectedRoute element={<UnfinalizedInvoices />} route="unfinalized-invoices" />} />
        <Route path="/finalized-invoices" element={<ProtectedRoute element={<FinalizedInvoices />} route="finalized-invoices" />} />
        <Route path="/user-management" element={<ProtectedRoute element={<UserManagement />} route="user-management" />} />
        <Route path="/invoice-print/:invoiceId" element={<ProtectedRoute element={<InvoicePrint />} route="finalized-invoices" />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

export default App;

