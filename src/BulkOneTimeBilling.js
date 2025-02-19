import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || 'https://billing-system-api-8m6c.onrender.com';

const BulkOneTimeBilling = () => {
  const [file, setFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate(); // Add navigation hook

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (!file) {
      alert("Please select a file before uploading.");
      return;
    }

    try {
      setLoading(true);
      setUploadStatus(null);

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const binaryString = event.target.result;
          const workbook = XLSX.read(binaryString, { type: "binary" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);

          // Send to bulk upload endpoint
          const response = await fetch(`${API_URL}/api/bulk-addl-billings`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ billingRecords: jsonData }),
          });

          const result = await response.json();
          
          if (response.ok) {
            setUploadStatus(`Upload successful! ${result.message}`);
          } else {
            throw new Error(result.error || "Upload failed");
          }
        } catch (error) {
          console.error("Error processing file:", error);
          setUploadStatus(`Error: ${error.message}`);
        }
      };

      reader.readAsBinaryString(file);
    } catch (error) {
      console.error("Error processing file:", error);
      setUploadStatus("An error occurred during upload.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="billing-container">
        {/* Back to Main Menu Button */}
      <button className="back-button" onClick={() => navigate("/")}>
        Back to Main Menu
      </button>
      <h1 className="billing-title">Bulk One-Time Billing Import</h1>
      
      <div className="form-group">
        <label>Select Excel File:</label>
        <input 
          type="file" 
          accept=".xlsx, .xls" 
          onChange={handleFileChange} 
          className="file-input" 
        />
       <small className="file-format-hint">
  Expected columns: partner_code, item_code, client_name, description, amount, billing_date
</small>
      </div>

      <button 
        onClick={handleUpload} 
        className="upload-button" 
        disabled={loading || !file}
      >
        {loading ? "Uploading..." : "Upload File"}
      </button>

      {uploadStatus && (
        <p className={`upload-status ${uploadStatus.includes("Error") ? "error" : "success"}`}>
          {uploadStatus}
        </p>
      )}
    </div>
  );
};

export default BulkOneTimeBilling;
