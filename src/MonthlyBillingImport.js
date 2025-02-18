import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import "./App.css";

const MonthlyBillingImport = () => {
  const [data, setData] = useState([]);
  const [uploadStatus, setUploadStatus] = useState('');
  const navigate = useNavigate();

  const columnMapping = {
    "Month/Year": "month_year",
    "Client Code": "client_code",
    "Client Name": "client_name",
    "Legal Company Code": "legal_company_code",
    "Legal Name": "legal_name",
    "FEIN": "fein",
    "State Code": "state_code",
    "Pay Group Name": "pay_group_name",
    "Is Pay Group Active": "is_pay_group_active",
    "New Pay Group Count": "new_pay_group_count",
    "Live Payroll Count": "live_payroll_count",
    "Total Active Employees": "total_active_employees",
    "Total Employees Paid In Month": "total_employees_paid",
    "Total Billing": "total_billing",
    "Total One Time Billing": "total_one_time_billing",
    "Total Checks And Vouchers": "total_checks_and_vouchers"
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) {
      setUploadStatus('Please select a file to upload.');
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {
          type: 'array',
          cellDates: true,
          cellStyles: true,
          cellNF: true
        });

        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        let parsedData = XLSX.utils.sheet_to_json(sheet, {
          defval: null,
          raw: true,
          dateNF: 'yyyy-mm-dd'
        });

        // Data validation and cleanup
        parsedData = parsedData.map((row, index) => {
          let cleanedRow = {};
          
          // Validate required fields exist
          Object.keys(columnMapping).forEach(excelHeader => {
            if (!(excelHeader in row)) {
              throw new Error(`Missing required column: ${excelHeader}`);
            }
          });

          Object.entries(row).forEach(([key, value]) => {
            const newKey = columnMapping[key] || key;
            
            // Handle different data types
            switch(newKey) {
              case 'is_pay_group_active':
                cleanedRow[newKey] = String(value).toLowerCase() === '1' || 
                                   String(value).toLowerCase() === 'true' || 
                                   String(value).toLowerCase() === 'yes';
                break;

              case 'total_billing':
              case 'total_one_time_billing':
                cleanedRow[newKey] = value !== null ? 
                  parseFloat(String(value).replace(/[^0-9.-]+/g, '')) : null;
                break;

              case 'new_pay_group_count':
              case 'live_payroll_count':
              case 'total_active_employees':
              case 'total_employees_paid':
              case 'total_checks_and_vouchers':
                cleanedRow[newKey] = value !== null ? 
                  parseInt(String(value).replace(/[^0-9-]+/g, ''), 10) : null;
                break;

              case 'month_year':
                // Handle date format
                if (value instanceof Date) {
                  cleanedRow[newKey] = value.toISOString().split('T')[0].substring(0, 8) + '01';
                } else {
                  // Attempt to parse string date
                  const dateValue = new Date(value);
                  if (!isNaN(dateValue.getTime())) {
                    cleanedRow[newKey] = dateValue.toISOString().split('T')[0].substring(0, 8) + '01';
                  } else {
                    // Ensure YYYY-MM-01 format
                    const dateStr = String(value).trim();
                    if (/^\d{4}-\d{2}$/.test(dateStr)) {
                      cleanedRow[newKey] = dateStr + '-01';
                    } else {
                      cleanedRow[newKey] = value;
                    }
                  }
                }
                break;

              default:
                cleanedRow[newKey] = value !== null ? String(value).trim() : null;
            }
          });

          return cleanedRow;
        });

        console.log('Parsed data sample:', parsedData[0]);
        setData(parsedData);
        setUploadStatus('File parsed successfully! Ready to upload.');
      } catch (error) {
        console.error('Error parsing file:', error);
        setUploadStatus(`Error parsing file: ${error.message}`);
        setData([]);
      }
    };

    reader.onerror = (error) => {
      console.error('Error reading file:', error);
      setUploadStatus('Error reading file. Please try again.');
      setData([]);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (data.length === 0) {
      setUploadStatus('No data to upload. Please select a file first.');
      return;
    }

    try {
      const response = await fetch('http://localhost:5050/upload-billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billingData: data }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setUploadStatus('File uploaded successfully!');
        console.log('Upload successful:', result);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus(`Upload failed: ${error.message}`);
    }
  };

  return (
    <div className="billing-import-container">
      <h1 className="billing-import-title">Import Monthly Billing</h1>
      
      <button className="back-button" onClick={() => navigate("/")}>
        Back to Main Menu
      </button>

      <input 
        type="file" 
        accept=".xlsx, .xls" 
        onChange={handleFileChange} 
        className="file-input" 
      />
      
      <button 
        onClick={handleUpload} 
        className="upload-button"
        disabled={data.length === 0}
      >
        Upload to Database
      </button>
      
      <p className="status-message">{uploadStatus}</p>

      {data.length > 0 && (
        <div className="table-container">
          <table className="billing-table">
            <thead>
              <tr>
                {Object.keys(data[0]).map((key) => (
                  <th key={key}>{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 100).map((row, index) => (
                <tr key={index}>
                  {Object.values(row).map((value, i) => (
                    <td key={i}>{String(value)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 100 && (
            <p className="table-note">Showing first 100 rows of {data.length} total rows</p>
          )}
        </div>
      )}
    </div>
  );
};

export default MonthlyBillingImport;


