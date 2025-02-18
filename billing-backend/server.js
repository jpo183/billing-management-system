const express = require("express");
const cors = require("cors");
const { pool } = require("./db"); // Destructure pool from the import
const path = require('path');

const app = express();
const port = 5050;

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://billing-system-frontend.onrender.com'  // Your Render frontend URL
    : 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const multer = require("multer");
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });

app.use((req, res, next) => {
  console.log(`📩 Received ${req.method} request to ${req.url}`);
  next();
});

app.post("/upload", upload.single("file"), (req, res) => {
  try {
    console.log("✅ File uploaded successfully:", req.file.originalname);
    res.status(200).json({ message: "File uploaded successfully" });
  } catch (error) {
    console.error("❌ Error uploading file:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/fetch-distinct-months", async (req, res) => {
  try {
    const result = await pool.query("SELECT DISTINCT TO_CHAR(month_year, 'YYYY-MM') AS month_year FROM monthly_billing ORDER BY month_year DESC");
    res.json(result.rows.map(row => row.month_year));
  } catch (error) {
    console.error("❌ Error fetching distinct months:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.post("/upload-billing", async (req, res) => {
  try {
    const { billingData } = req.body;

    if (!billingData?.length) {
      return res.status(400).json({ error: "No billing data received" });
    }

    const validColumns = [
      "month_year", "client_code", "client_name", "legal_company_code", "legal_name",
      "fein", "state_code", "total_employees_paid", "total_billing",
      "total_one_time_billing", "pay_group_name", "is_pay_group_active",
      "new_pay_group_count", "live_payroll_count", "total_active_employees", 
      "total_checks_and_vouchers"
    ];

    console.log("🔍 Records received:", billingData.length);

    await pool.query('BEGIN');

    // First, ensure staging table exists and has no constraints
    await pool.query(`
      DROP TABLE IF EXISTS monthly_billing_staging;
      CREATE TABLE monthly_billing_staging (LIKE monthly_billing INCLUDING ALL);
      ALTER TABLE monthly_billing_staging DROP CONSTRAINT IF EXISTS monthly_billing_staging_month_year_client_code_key;
    `);

    // Insert into staging
    const stagingColumnNames = validColumns.join(", ");
    const stagingPlaceholders = validColumns.map((_, i) => `$${i + 1}`).join(", ");
    const stagingQuery = `
      INSERT INTO monthly_billing_staging (${stagingColumnNames}) 
      VALUES (${stagingPlaceholders})
    `;

    for (const entry of billingData) {
      const values = validColumns.map(col => entry[col] !== undefined ? entry[col] : null);
      await pool.query(stagingQuery, values);
    }

    // Clear main table for the month being imported
    await pool.query(`
      DELETE FROM monthly_billing 
      WHERE month_year = (SELECT month_year FROM monthly_billing_staging LIMIT 1)
    `);

    // Aggregate and insert into main table
    await pool.query(`
      INSERT INTO monthly_billing (
        month_year, client_code, client_name, legal_company_code, legal_name,
        fein, state_code, total_employees_paid, total_billing,
        total_one_time_billing, pay_group_name, is_pay_group_active,
        new_pay_group_count, live_payroll_count, total_active_employees, 
        total_checks_and_vouchers
      )
      SELECT 
        month_year,
        client_code,
        MAX(client_name) as client_name,
        MAX(legal_company_code) as legal_company_code,
        MAX(legal_name) as legal_name,
        MAX(fein) as fein,
        MAX(state_code) as state_code,
        SUM(COALESCE(total_employees_paid, 0)) as total_employees_paid,
        SUM(COALESCE(total_billing, 0)) as total_billing,
        SUM(COALESCE(total_one_time_billing, 0)) as total_one_time_billing,
        MAX(pay_group_name) as pay_group_name,
        bool_or(COALESCE(is_pay_group_active, false)) as is_pay_group_active,
        SUM(COALESCE(new_pay_group_count, 0)) as new_pay_group_count,
        SUM(COALESCE(live_payroll_count, 0)) as live_payroll_count,
        SUM(COALESCE(total_active_employees, 0)) as total_active_employees,
        SUM(COALESCE(total_checks_and_vouchers, 0)) as total_checks_and_vouchers
      FROM monthly_billing_staging
      GROUP BY month_year, client_code
    `);

    await pool.query('DROP TABLE monthly_billing_staging');
    await pool.query('COMMIT');
    res.status(201).json({ message: "Billing data uploaded successfully" });

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error("❌ Error uploading billing data:", error);
    res.status(500).json({ error: error.message });
  }
});





// PARTNER ROUTES
// Update the GET route to include optional active filter
app.get("/api/partners", async (req, res) => {
  try {
    const { showInactive } = req.query;
    let query = "SELECT * FROM partners";
    
    // Only add WHERE clause if we're not showing inactive
    if (!showInactive || showInactive === 'false') {
      query += " WHERE is_active = true";
    }
    
    query += " ORDER BY partner_name ASC";
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching partners:", error);
    res.status(500).send("Server error");
  }
});

// Update the POST route to include is_active
app.post("/api/partners", async (req, res) => {
  try {
    const { 
      partner_code, 
      partner_name, 
      contact_name, 
      contact_email, 
      phone_number, 
      contract_start, 
      contract_term, 
      auto_renews, 
      override_renewal_date,
      is_active 
    } = req.body;
    
    const result = await pool.query(
      `INSERT INTO partners (
        partner_code, partner_name, contact_name, contact_email, 
        phone_number, contract_start, contract_term, auto_renews, 
        override_renewal_date, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [
        partner_code, partner_name, contact_name, contact_email, 
        phone_number, contract_start, contract_term, auto_renews, 
        override_renewal_date || null, 
        is_active !== undefined ? is_active : true
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error adding partner:", error);
    res.status(500).json({ error: "Server error while adding partner" });
  }
});

// Update the PUT route to include is_active
app.put("/api/partners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      partner_code, 
      partner_name, 
      contact_name, 
      contact_email, 
      phone_number, 
      contract_start, 
      contract_term, 
      auto_renews, 
      override_renewal_date,
      is_active 
    } = req.body;
    
    const result = await pool.query(
      `UPDATE partners SET 
        partner_code=$1, partner_name=$2, contact_name=$3, 
        contact_email=$4, phone_number=$5, contract_start=$6, 
        contract_term=$7, auto_renews=$8, override_renewal_date=$9,
        is_active=$10 
       WHERE id=$11 RETURNING *`,
      [
        partner_code, partner_name, contact_name, contact_email,
        phone_number, contract_start, contract_term, auto_renews,
        override_renewal_date || null, is_active, id
      ]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Partner not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating partner:", error);
    res.status(500).json({ error: "Server error while updating partner" });
  }
});

// BILLING ITEMS ROUTES
app.get("/api/billing-items", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, item_code, item_name, description, is_active, billing_type FROM billing_items ORDER BY id"
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching billing items:", err);
    res.status(500).send("Server Error");
  }
});




app.post("/api/billing-items", async (req, res) => {
  try {
    const { item_code, item_name, description, is_active, billing_type = 'standard' } = req.body;
    
    if (!item_code || !item_name) {
      return res.status(400).json({ error: "Billing item code and name are required" });
    }

    const newItem = await pool.query(
      `INSERT INTO billing_items 
       (item_code, item_name, description, is_active, billing_type) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [item_code, item_name, description || null, is_active !== undefined ? is_active : true, billing_type]
    );

    res.json(newItem.rows[0]);
  } catch (err) {
    console.error("Error adding billing item:", err);
    res.status(500).send("Server Error");
  }
});

app.put("/api/billing-items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { item_name, description, is_active, billing_type } = req.body;

    const updateQuery = await pool.query(
      `UPDATE billing_items 
       SET item_name = $1, description = $2, is_active = $3, billing_type = $4 
       WHERE id = $5 
       RETURNING *`,
      [item_name, description, is_active, billing_type, id]
    );

    if (updateQuery.rowCount === 0) {
      return res.status(404).json({ error: "Billing item not found" });
    }
    res.json(updateQuery.rows[0]);
  } catch (err) {
    console.error("Error updating billing item:", err);
    res.status(500).send("Server Error");
  }
});

app.delete("/api/billing-items/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if billing item is referenced in other tables (adjust query as needed)
    const checkUsage = await pool.query(
      "SELECT COUNT(*) FROM client_billings WHERE billing_item_id = $1",
      [id]
    );

    if (checkUsage.rows[0].count > 0) {
      return res.status(400).json({ error: "Cannot delete: Billing item is in use." });
    }

    // Proceed with deletion if not referenced
    const deleteQuery = await pool.query("DELETE FROM billing_items WHERE id = $1 RETURNING *", [id]);

    if (deleteQuery.rowCount === 0) {
      return res.status(404).json({ error: "Billing item not found" });
    }

    res.json({ message: "Billing item deleted successfully" });
  } catch (err) {
    console.error("Error deleting billing item:", err);
    res.status(500).json({ error: "Server error while deleting billing item" });
  }
});

// PARTNER BILLING ROUTES

// Get all billing entries for a specific partner
app.get("/monthly-billing/partner/:partnerId/:month", async (req, res) => {
  try {
    const { partnerId, month } = req.params;
    console.log(`🔍 Request params:`, { partnerId, month });
    
    // Log a sample client_code to verify data
    const sampleData = await pool.query(
      `SELECT client_code FROM monthly_billing LIMIT 1`
    );
    console.log('Sample client_code:', sampleData.rows[0]?.client_code);

    const result = await pool.query(
      `SELECT mb.* FROM monthly_billing mb
       WHERE LEFT(mb.client_code, 4) = $1 
       AND TO_CHAR(mb.month_year, 'YYYY-MM') = $2`,
      [partnerId, month]
    );

    console.log(`Query results:`, {
      rowCount: result.rows.length,
      firstRow: result.rows[0]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: "No billing records found",
        params: { partnerId, month }
      });
    }

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error details:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      message: error.message
    });
  }
});





// Add a new billing entry for a partner
app.post("/api/partner-billing", async (req, res) => {
  try {
    let { partner_id, billing_item_id, amount, billing_frequency, start_date, end_date, is_active } = req.body;

    // 🟢 Ensure is_active is always a valid boolean
    is_active = is_active === true || is_active === "true" ? true : false;

    const result = await pool.query(
      "INSERT INTO partner_billings (partner_id, billing_item_id, amount, billing_frequency, start_date, end_date, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
      [partner_id, billing_item_id, amount, billing_frequency, start_date, end_date, is_active]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error adding partner billing entry:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});




// Update a billing entry
app.put("/api/partner-billing/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let { billing_item_id, amount, billing_frequency, start_date, end_date, is_active } = req.body;

    // 🟢 Ensure is_active is always a valid boolean
    is_active = is_active === true || is_active === "true" ? true : false;

    const result = await pool.query(
      "UPDATE partner_billings SET billing_item_id = $1, amount = $2, billing_frequency = $3, start_date = $4, end_date = $5, is_active = $6 WHERE id = $7 RETURNING *",
      [billing_item_id, amount, billing_frequency, start_date, end_date, is_active, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Billing entry not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error updating partner billing entry:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Delete a billing entry
app.delete("/api/partner-billing/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("DELETE FROM partner_billings WHERE id = $1 RETURNING *", [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Billing entry not found" });
    }
    res.json({ message: "Billing entry deleted successfully" });
  } catch (error) {
    console.error("Error deleting partner billing entry:", error);
    res.status(500).send("Server error");
  }
});

// Fetch a single partner by ID
app.get("/api/partners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM partners WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Partner not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching partner:", error);
    res.status(500).send("Server error");
  }
});
// edits billing items in partner billing setup
app.put("/api/partner-billing/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { billing_item_id, amount, billing_frequency, start_date, end_date, is_active } = req.body;

    const result = await pool.query(
      "UPDATE partner_billings SET billing_item_id = $1, amount = $2, billing_frequency = $3, start_date = $4, end_date = $5, is_active = $6 WHERE id = $7 RETURNING *",
      [billing_item_id, amount, billing_frequency, start_date, end_date, is_active, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Billing entry not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error updating partner billing entry:", error);
    res.status(500).send("Server error");
  }
});

// hnadles deltion of billing items in partner setup billing
app.delete("/api/partner-billing/:id", async (req, res) => {
  const client = await pool.connect();
  console.log("🔍 Starting deletion process...");
  
  try {
    await client.query('BEGIN');
    const { id } = req.params;

    // First verify the billing record exists and get its type
    const billingCheck = await client.query(`
      SELECT pb.*, bi.billing_type 
      FROM partner_billings pb
      JOIN billing_items bi ON pb.billing_item_id = bi.id
      WHERE pb.id = $1
    `, [id]);
    
    console.log("📝 Billing record found:", billingCheck.rows[0]);

    // Check for existing tiers
    const tiersCheck = await client.query(
      "SELECT * FROM billing_tiers WHERE partner_billing_id = $1",
      [id]
    );
    console.log(`📊 Found ${tiersCheck.rowCount} existing tiers:`, tiersCheck.rows);

    // Delete the billing record (should cascade to tiers)
    const result = await client.query(
      "DELETE FROM partner_billings WHERE id = $1 RETURNING *", 
      [id]
    );
    console.log("🗑️ Deletion result:", result.rows[0]);

    // Verify tiers were deleted
    const postDeleteTiersCheck = await client.query(
      "SELECT COUNT(*) FROM billing_tiers WHERE partner_billing_id = $1",
      [id]
    );
    console.log("✅ Tiers remaining after delete:", postDeleteTiersCheck.rows[0].count);

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      console.log("❌ No billing record found to delete");
      return res.status(404).json({ error: "Billing entry not found" });
    }

    await client.query('COMMIT');
    res.json({ 
      message: "Billing entry and associated tiers deleted successfully",
      billingDeleted: result.rowCount,
      initialTierCount: tiersCheck.rowCount,
      remainingTiers: postDeleteTiersCheck.rows[0].count
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error during deletion:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      details: error.message
    });
  } finally {
    client.release();
    console.log("🏁 Deletion process completed");
  }
});

// retrieve monthly billing data for reporting page
app.get("/monthly-billing/:month", async (req, res) => {
  try {
    const { month } = req.params;
    const result = await pool.query(
      "SELECT * FROM monthly_billing WHERE TO_CHAR(month_year, 'YYYY-MM') = $1",
      [month]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching monthly billing:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// client billing setup routes
// Add these routes to server.js

// Get all client billings for a partner
app.get("/api/client-billings/:partnerId", async (req, res) => {
  try {
    const { partnerId } = req.params;

    const result = await pool.query(`
      SELECT cb.*, bi.item_name, bi.item_code
      FROM client_billings cb
      JOIN billing_items bi ON cb.billing_item_id = bi.id
      WHERE cb.partner_id = $1 
      ORDER BY cb.billing_date DESC`,
      [partnerId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Error fetching client billings:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Add new client billing
app.post("/api/client-billings", async (req, res) => {
  try {
    const { 
      partner_id, 
      client_id, 
      client_name, 
      billing_item_id, 
      billing_date, 
      end_date,
      base_amount = 0, 
      per_employee_amount = 0,
      is_active = true 
    } = req.body;

    if (!client_id || !client_name) {
      return res.status(400).json({ error: "Client ID and Client Name are required" });
    }

    const result = await pool.query(
      `INSERT INTO client_billings 
       (partner_id, client_id, client_name, billing_item_id, billing_date, end_date,
        base_amount, per_employee_amount, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING *`,
      [partner_id, client_id, client_name, billing_item_id, billing_date, end_date,
       base_amount || 0, per_employee_amount || 0, is_active]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error adding client billing:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update client billing
app.put("/api/client-billings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      client_id, 
      client_name, 
      billing_item_id, 
      billing_date, 
      end_date,
      base_amount, 
      per_employee_amount,
      is_active 
    } = req.body;

    if (!client_id || !client_name) {
      return res.status(400).json({ error: "Client ID and Client Name are required" });
    }

    const result = await pool.query(
      `UPDATE client_billings 
       SET client_id = $1, 
           client_name = $2, 
           billing_item_id = $3, 
           billing_date = $4, 
           end_date = $5,
           base_amount = $6, 
           per_employee_amount = $7, 
           is_active = $8,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = $9 
       RETURNING *`,
      [client_id, client_name, billing_item_id, billing_date, end_date,
       base_amount, per_employee_amount, is_active, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Billing entry not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Error updating client billing:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Delete client billing
app.delete("/api/client-billings/:id", async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    
    // Verify the billing record exists
    const checkRecord = await client.query(
      "SELECT id FROM client_billings WHERE id = $1",
      [id]
    );
    
    if (checkRecord.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Client billing not found" });
    }
    
    // Perform the deletion
    const result = await client.query(
      "DELETE FROM client_billings WHERE id = $1 RETURNING *",
      [id]
    );
    
    await client.query('COMMIT');
    res.json({ 
      success: true,
      message: "Client billing deleted successfully",
      deletedRecord: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error deleting client billing:", error);
    res.status(500).json({ 
      error: "Server error",
      details: error.message 
    });
  } finally {
    client.release();
  }
});

// API Route to fetch all add-on billing records or filter by partner
app.get("/api/partner-billing/:partnerId", async (req, res) => {
  try {
    const { partnerId } = req.params;

    const result = await pool.query(`
     SELECT 
        pb.id,
        pb.partner_id,
        pb.billing_item_id,
        pb.amount,
        pb.billing_frequency,
        pb.start_date,
        pb.end_date,
        pb.is_active,
        bi.billing_type,
        bi.item_name,
        'N/A' as client_name,
        NULL as base_amount,
        NULL as per_employee_amount,
        NULL as client_id,      
        'partner_billing' AS billing_source
      FROM partner_billings pb
      JOIN billing_items bi ON pb.billing_item_id = bi.id
      WHERE pb.partner_id = $1
      
      UNION ALL

      SELECT 
        cb.id,
        cb.partner_id,
        cb.billing_item_id,
        CASE 
          WHEN cb.per_employee_amount > 0 THEN cb.base_amount
          ELSE cb.base_amount
        END as amount,
        'Monthly' as billing_frequency,
        cb.billing_date as start_date,
        cb.end_date,
        cb.is_active,
        bi.billing_type,
        bi.item_name,
        cb.client_name,
        cb.base_amount,
        cb.per_employee_amount,
        cb.client_id,
        'client_billing' AS billing_source
      FROM client_billings cb
      JOIN billing_items bi ON cb.billing_item_id = bi.id
      WHERE cb.partner_id = $1 AND 
        cb.is_active = true AND 
        (cb.end_date IS NULL OR cb.end_date >= CURRENT_DATE) AND
        cb.billing_date <= CURRENT_DATE
    `,
    [partnerId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching partner billing entries:", error);
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// API Route to add a new add-on billing record
app.post("/api/addl-billings", async (req, res) => {
  const { partner_id, client_name, billing_item_id, description, amount, billing_date } = req.body;

  try {
    // First, validate the input
    if (!partner_id || !client_name || !billing_item_id || !amount || !billing_date) {
      return res.status(400).json({ 
        error: "Missing required fields",
        required: ["partner_id", "client_name", "billing_item_id", "amount", "billing_date"]
      });
    }

    // Insert the new billing record
    const insertQuery = `
      INSERT INTO addl_billings 
        (partner_id, client_name, billing_item_id, description, amount, billing_date)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`;

    const result = await pool.query(insertQuery, [
      partner_id,
      client_name,
      billing_item_id,
      description,
      amount,
      billing_date
    ]);

    // Fetch the complete record with joined data
    const completeRecordQuery = `
      SELECT 
        ab.id,
        ab.client_name,
        ab.billing_date,
        ab.amount,
        ab.description,
        bi.item_name,
        p.partner_name,
        p.id as partner_id
      FROM addl_billings ab
      JOIN billing_items bi ON ab.billing_item_id = bi.id
      JOIN partners p ON ab.partner_id = p.id
      WHERE ab.id = $1`;

    const completeRecord = await pool.query(completeRecordQuery, [result.rows[0].id]);
    res.status(201).json(completeRecord.rows[0]);
  } catch (error) {
    console.error("Error adding add-on billing:", error);
    res.status(500).json({ 
      error: "Server Error",
      details: error.message
    });
  }
});

// Get all additional billings
// Get filtered one-time billings by partner and date range
app.get("/api/addl-billings/:partnerId", async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { start_date, end_date } = req.query;

    // Debug queries
    console.log('Checking raw addl_billings data...');
    const rawData = await pool.query(`
      SELECT * FROM addl_billings WHERE partner_id = $1
    `, [partnerId]);
    console.log(`Found ${rawData.rowCount} raw records`);
    
    console.log('Checking join with billing_items...');
    const joinCheck = await pool.query(`
      SELECT ab.id, bi.item_name 
      FROM addl_billings ab
      JOIN billing_items bi ON ab.billing_item_id = bi.id
      WHERE ab.partner_id = $1
    `, [partnerId]);
    console.log(`Found ${joinCheck.rowCount} records after billing_items join`);
    
    console.log('Checking invoice status...');
    const invoiceCheck = await pool.query(`
      SELECT ab.id, im.status
      FROM addl_billings ab
      LEFT JOIN invoice_one_time_fees iotf ON iotf.addl_billing_id = ab.id
      LEFT JOIN invoice_master im ON iotf.invoice_id = im.id
      WHERE ab.partner_id = $1
    `, [partnerId]);
    console.log('Invoice status check:', invoiceCheck.rows);

    const result = await pool.query(`
      SELECT 
        ab.id as id,
        ab.partner_id,
        ab.client_name,
        ab.billing_date,
        ab.amount,
        ab.description,
        ab.billing_item_id,
        bi.item_name,
        bi.item_code,
        p.partner_name,
        p.partner_code
      FROM addl_billings ab
      JOIN billing_items bi ON ab.billing_item_id = bi.id
      JOIN partners p ON ab.partner_id = p.id
      WHERE ab.partner_id = $1
      AND ab.billing_date >= $2
      AND ab.billing_date <= $3
      AND NOT EXISTS (
        SELECT 1 
        FROM invoice_one_time_fees iotf
        JOIN invoice_master im ON iotf.invoice_id = im.id
        WHERE iotf.addl_billing_id = ab.id
        AND im.status != 'void'
      )
      ORDER BY ab.billing_date DESC
    `, [partnerId, start_date, end_date]);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching filtered additional billings:", error);
    res.status(500).json({ 
      error: "Server Error",
      details: error.message
    });
  }
});

// Get all additional billings (original endpoint)
app.get("/api/addl-billings", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ab.*,
        bi.item_name,
        p.partner_name
      FROM addl_billings ab
      JOIN billing_items bi ON ab.billing_item_id = bi.id
      JOIN partners p ON ab.partner_id = p.id
      WHERE NOT EXISTS (
        SELECT 1 
        FROM invoice_one_time_fees iotf
        JOIN invoice_master im ON iotf.invoice_id = im.id
        WHERE iotf.addl_billing_id = ab.id
        AND im.status != 'void'
      )
      ORDER BY ab.billing_date DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching additional billings:", error);
    res.status(500).json({ 
      error: "Server Error",
      details: error.message
    });
  }
});


// Update a billing record
app.put("/api/addl-billings/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { partner_id, client_name, billing_item_id, description, amount, billing_date } = req.body;

    // Ensure required fields are provided
    if (!partner_id || !client_name || !billing_item_id || !amount || !billing_date) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["partner_id", "client_name", "billing_item_id", "amount", "billing_date"]
      });
    }

    // Update the billing record in the database
    const updateQuery = `
      UPDATE addl_billings
      SET partner_id = $1, client_name = $2, billing_item_id = $3, description = $4, amount = $5, billing_date = $6
      WHERE id = $7
      RETURNING *`;

    const result = await pool.query(updateQuery, [
      partner_id,
      client_name,
      billing_item_id,
      description || null,
      amount,
      billing_date,
      id
    ]);

    // If no rows were updated, return an error
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Billing record not found" });
    }

    res.json(result.rows[0]);  // Return the updated record
  } catch (error) {
    console.error("Error updating billing record:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.delete("/api/addl-billings/:id", async (req, res) => {
  const client = await pool.connect();
  console.log("🔍 Starting deletion process for ID:", req.params.id);
  
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    
    // First check for any references in non-voided invoices
    console.log("Checking for active/finalized invoices...");
    const activeInvoiceCheck = await client.query(`
      SELECT DISTINCT im.invoice_number, im.status
      FROM invoice_one_time_fees iotf
      JOIN invoice_master im ON iotf.invoice_id = im.id
      WHERE iotf.addl_billing_id = $1
      AND im.status != 'void'`,
      [id]
    );

    if (activeInvoiceCheck.rowCount > 0) {
      console.log("Found active/finalized invoices:", activeInvoiceCheck.rows);
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: "Cannot delete: Billing is used in active or finalized invoices. Please void all related invoices first.",
        invoices: activeInvoiceCheck.rows
      });
    }

    // If we get here, any existing references are in voided invoices
    // First delete references from invoice_one_time_fees
    console.log("Deleting references from voided invoices...");
    await client.query(`
      DELETE FROM invoice_one_time_fees
      WHERE addl_billing_id = $1
      AND invoice_id IN (
        SELECT id FROM invoice_master WHERE status = 'void'
      )`,
      [id]
    );

    // Now we can delete the billing record itself
    console.log("Deleting billing record...");
    const result = await client.query(
      "DELETE FROM addl_billings WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      console.log("No record found to delete");
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Billing record not found" });
    }

    await client.query('COMMIT');
    console.log("Deletion successful");
    res.json({ 
      success: true,
      message: "Billing record deleted successfully",
      deletedRecord: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("❌ Error during deletion:", error);
    res.status(500).json({ 
      error: "Internal Server Error",
      details: error.message
    });
  } finally {
    client.release();
    console.log("🏁 Deletion process completed");
  }
});

// Bulk upload endpoint for additional billings
app.post("/api/bulk-addl-billings", async (req, res) => {
  const { billingRecords } = req.body;

  if (!Array.isArray(billingRecords) || billingRecords.length === 0) {
    return res.status(400).json({ error: "No valid billing records provided" });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Fetch all partners and billing items for lookup
    const partnersResult = await client.query("SELECT id, partner_code FROM partners");
    const billingItemsResult = await client.query("SELECT id, item_code FROM billing_items");

    // Debug log for available codes
    console.log("Available partner codes:", partnersResult.rows.map(p => p.partner_code));
    console.log("Available item codes:", billingItemsResult.rows.map(i => i.item_code));

    // Create lookup maps with case-insensitive string keys
    const partnerMap = new Map(
      partnersResult.rows.map(p => [String(p.partner_code).trim(), p.id])
    );
    const itemMap = new Map(
      billingItemsResult.rows.map(i => [String(i.item_code).trim(), i.id])
    );

    // Transform and validate records
    const transformedRecords = [];
    const errors = [];

    billingRecords.forEach((record, index) => {
      const rowNum = index + 1;
      const rowErrors = [];

      // Check required fields
      if (!record.partner_code) rowErrors.push("Missing partner_code");
      if (!record.item_code) rowErrors.push("Missing item_code");
      if (!record.client_name) rowErrors.push("Missing client_name");
      if (!record.amount) rowErrors.push("Missing amount");
      if (!record.billing_date) rowErrors.push("Missing billing_date");

      // Look up IDs with proper string conversion
      const partnerCode = String(record.partner_code).trim();
      const itemCode = String(record.item_code).trim();
      
      const partnerId = partnerMap.get(partnerCode);
      const itemId = itemMap.get(itemCode);

      // Debug log for each record's lookup
      console.log(`Row ${rowNum} lookup:`, {
        givenPartnerCode: partnerCode,
        foundPartnerId: partnerId,
        givenItemCode: itemCode,
        foundItemId: itemId
      });

      if (!partnerId) rowErrors.push(`Invalid partner_code: ${partnerCode}`);
      if (!itemId) rowErrors.push(`Invalid item_code: ${itemCode}`);

      if (rowErrors.length > 0) {
        errors.push(`Row ${rowNum}: ${rowErrors.join(", ")}`);
      } else {
        transformedRecords.push({
          partner_id: partnerId,
          client_name: record.client_name,
          billing_item_id: itemId,
          description: record.description || null,
          amount: parseFloat(record.amount),
          billing_date: record.billing_date
        });
      }
    });

    if (errors.length > 0) {
      throw new Error(`Validation errors:\n${errors.join('\n')}`);
    }

    // Rest of your code remains the same...
    
    

    // Insert records
    const insertQuery = `
      INSERT INTO addl_billings 
        (partner_id, client_name, billing_item_id, description, amount, billing_date)
      VALUES ($1, $2, $3, $4, $5, $6)`;

    for (const record of transformedRecords) {
      await client.query(insertQuery, [
        record.partner_id,
        record.client_name,
        record.billing_item_id,
        record.description,
        record.amount,
        record.billing_date
      ]);
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: `Successfully uploaded ${transformedRecords.length} billing records`
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error("Error uploading bulk billing records:", error);
    res.status(500).json({ 
      error: "Failed to upload billing records",
      details: error.message
    });
  } finally {
    client.release();
  }
});

// PARTNER BILLING ROUTES

// Get all billing entries for a specific partner  !!! THIS ONE IS MOST LIKELY WRONG!!!
// app.get("/api/partner-billing/:partnerId", async (req, res) => {
//  try {
 //   const { partnerId } = req.params;
 //   const result = await pool.query(`
 //     SELECT pb.*, bi.billing_type, bi.item_name
 //     FROM partner_billings pb
 //     JOIN billing_items bi ON pb.billing_item_id = bi.id
 //     WHERE pb.partner_id = $1`,
 //     [partnerId]
 //   );
 //   res.json(result.rows);
//  } catch (error) {
//    console.error("Error fetching partner billing entries:", error);
//    res.status(500).json({ error: "Server error" });
//  }
  
  
// });

// Keep existing endpoint
app.get("/api/partners/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM partners WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Partner not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching partner:", error);
    res.status(500).send("Server error");
  }
});

// Endpoint for partner details and billings in reporting page
app.get("/api/partners/:id/details", async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get partner basic info
    const partnerResult = await pool.query("SELECT * FROM partners WHERE id = $1", [id]);

    if (partnerResult.rows.length === 0) {
      return res.status(404).json({ error: "Partner not found" });
    }

    // Get partner billing items
    const billingItemsResult = await pool.query(`
      SELECT 
        pb.*,
        bi.item_name
      FROM partner_billings pb
      JOIN billing_items bi ON pb.billing_item_id = bi.id
      WHERE pb.partner_id = $1
      ORDER BY pb.start_date DESC
    `, [id]);

    // Combine the data
    const response = {
      ...partnerResult.rows[0],
      billing_items: billingItemsResult.rows
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching partner details:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// Fetch a single partner with details
//app.get("/api/partner-billing/:partnerId", async (req, res) => {
 // try {
  //  const { partnerId } = req.params;

//    const result = await pool.query(`
//      SELECT 
//        pb.*, 
//        bi.billing_type, 
//        bi.item_name, 
//        COALESCE(cb.client_name, 'N/A') AS client_name
//      FROM partner_billings pb
//      JOIN billing_items bi ON pb.billing_item_id = bi.id
//     LEFT JOIN client_billings cb ON pb.partner_id = cb.partner_id 
//        AND pb.billing_item_id = cb.billing_item_id
//      WHERE pb.partner_id = $1`,
//      [partnerId]
//    );

    // 🔍 Log raw query result
//    console.log(`🔎 Partner ID: ${partnerId}`);
//    console.log("📄 Raw Query Result from DB:", result.rows);

//    res.json(result.rows);
//  } catch (error) {
//    console.error("❌ Error fetching partner billing entries:", error);
//    res.status(500).json({ error: "Server error", details: error.message });
//  }
// });



app.post("/api/generate-invoice", async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const {
      partner_id,
      partner_code,
      partner_name,
      invoice_month,
      invoice_date,
      monthly_fees,
      recurring_fees,
      one_time_fees
    } = req.body;

    // Generate invoice number (unique approach)
    const invoice_number = `INV-${partner_code}-${invoice_month}-${Date.now()}`;

    // Insert invoice master record
    const masterResult = await client.query(
      `INSERT INTO invoice_master 
       (invoice_number, partner_id, partner_code, partner_name, invoice_date, invoice_month, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'draft')
       RETURNING id`,
      [
        invoice_number, 
        parseInt(partner_id),
        partner_code, 
        partner_name, 
        invoice_date, 
        invoice_month
      ]
    );

    const invoice_id = masterResult.rows[0].id;

    // Insert monthly fees
    if (monthly_fees?.length > 0) {
      for (const fee of monthly_fees) {
        await client.query(
          `INSERT INTO invoice_monthly_fees 
            (invoice_id, client_code, client_name, is_pay_group_active, 
             total_active_employees, base_fee_amount, per_employee_fee_amount, 
             total_monthly_fee, partner_id, partner_code)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            invoice_id,
            fee.client_code,
            fee.client_name,
            fee.is_pay_group_active,
            fee.total_active_employees || 0,
            fee.base_fee_amount || 0,
            fee.per_employee_fee_amount || 0,
            fee.total_monthly_fee || 0,
            fee.partner_id,
            fee.partner_code
          ]
        );
      }
    }

    // Insert recurring fees
    if (recurring_fees?.length > 0) {
      for (const fee of recurring_fees) {
        await client.query(
          `INSERT INTO invoice_recurring_fees 
            (invoice_id, partner_billing_id, partner_id, partner_code, 
             client_name, item_name, item_code, billing_item_id, 
             original_amount, invoiced_amount, override_reason, billing_frequency)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            invoice_id,
            fee.partner_billing_id || null,
            fee.partner_id,
            fee.partner_code,
            fee.client_name || 'N/A',
            fee.item_name || '',
            fee.item_code || '',
            fee.billing_item_id,
            fee.original_amount || 0,
            fee.invoiced_amount || 0,
            fee.override_reason || null,
            fee.billing_frequency || 'monthly'
          ]
        );
      }
    }

    // Insert one-time fees
    if (one_time_fees?.length > 0) {
      for (const fee of one_time_fees) {
        await client.query(
          `INSERT INTO invoice_one_time_fees 
            (invoice_id, addl_billing_id, partner_id, partner_code, 
             client_name, item_name, item_code, billing_item_id, 
             billing_date, original_amount, invoiced_amount, override_reason)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            invoice_id,
            fee.addl_billing_id || null,
            fee.partner_id,
            fee.partner_code,
            fee.client_name,
            fee.item_name,
            fee.item_code || '',
            fee.billing_item_id,
            fee.billing_date,
            fee.original_amount || 0,
            fee.invoiced_amount || 0,
            fee.override_reason || null
          ]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ 
      success: true, 
      invoice_number,
      invoice_id 
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating invoice:', error);
    res.status(500).json({ 
      error: "Failed to generate invoice",
      details: error.message 
    });
  } finally {
    client.release();
  }
});




// Get invoice master data
app.get("/api/invoice/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        im.*,
        (
          SELECT COALESCE(SUM(total_monthly_fee), 0) 
          FROM invoice_monthly_fees 
          WHERE invoice_id = im.id
        ) AS monthly_total,
        (
          SELECT COALESCE(SUM(invoiced_amount), 0) 
          FROM invoice_recurring_fees 
          WHERE invoice_id = im.id
        ) AS recurring_total,
        (
          SELECT COALESCE(SUM(invoiced_amount), 0) 
          FROM invoice_one_time_fees 
          WHERE invoice_id = im.id
        ) AS onetime_total,
        (
          SELECT COALESCE(SUM(total_monthly_fee), 0) 
          FROM invoice_monthly_fees 
          WHERE invoice_id = im.id
        ) +
        (
          SELECT COALESCE(SUM(invoiced_amount), 0) 
          FROM invoice_recurring_fees 
          WHERE invoice_id = im.id
        ) +
        (
          SELECT COALESCE(SUM(invoiced_amount), 0) 
          FROM invoice_one_time_fees 
          WHERE invoice_id = im.id
        ) AS grand_total
      FROM invoice_master im
      WHERE im.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Invoice not found" });
    }

    // Convert to numbers before sending response
    const invoice = {
      ...result.rows[0],
      monthly_total: Number(result.rows[0].monthly_total) || 0,
      recurring_total: Number(result.rows[0].recurring_total) || 0,
      onetime_total: Number(result.rows[0].onetime_total) || 0,
      grand_total: Number(result.rows[0].grand_total) || 0,
    };

    res.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    res.status(500).json({ error: error.message });
  }
});





// Get monthly billings for invoice
app.get("/api/invoice/:id/monthly", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM invoice_monthly_fees WHERE invoice_id = $1",
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get recurring billings for invoice
app.get("/api/invoice/:id/recurring", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM invoice_recurring_fees WHERE invoice_id = $1",
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get one-time billings for invoice
app.get("/api/invoice/:id/onetime", async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      "SELECT * FROM invoice_one_time_fees WHERE invoice_id = $1",
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update invoice status
app.put("/api/invoice/:id/status", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { id } = req.params;
    const { status } = req.body;

    if (!['draft', 'final', 'void'].includes(status)) {
      throw new Error('Invalid status');
    }

    const result = await client.query(
      "UPDATE invoice_master SET status = $1 WHERE id = $2 RETURNING *",
      [status, id]
    );

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
});

//retrieve  invoices
app.get("/api/invoices/:status", async (req, res) => {
  try {
    const { status } = req.params;
    const result = await pool.query(
      `SELECT 
        im.*,
        (
          SELECT COALESCE(SUM(total_monthly_fee), 0) 
          FROM invoice_monthly_fees 
          WHERE invoice_id = im.id
        ) AS monthly_total,
        (
          SELECT COALESCE(SUM(invoiced_amount), 0) 
          FROM invoice_recurring_fees 
          WHERE invoice_id = im.id
        ) AS recurring_total,
        (
          SELECT COALESCE(SUM(invoiced_amount), 0) 
          FROM invoice_one_time_fees 
          WHERE invoice_id = im.id
        ) AS onetime_total,
        (
          SELECT COALESCE(SUM(total_monthly_fee), 0) 
          FROM invoice_monthly_fees 
          WHERE invoice_id = im.id
        ) +
        (
          SELECT COALESCE(SUM(invoiced_amount), 0) 
          FROM invoice_recurring_fees 
          WHERE invoice_id = im.id
        ) +
        (
          SELECT COALESCE(SUM(invoiced_amount), 0) 
          FROM invoice_one_time_fees 
          WHERE invoice_id = im.id
        ) AS grand_total
      FROM invoice_master im
      WHERE im.status = $1
      ORDER BY im.invoice_date DESC`,
      [status]
    );

    // Ensure we always return an array, even if empty
    const invoices = (result.rows || []).map(invoice => ({
      ...invoice,
      monthly_total: Number(invoice.monthly_total) || 0,
      recurring_total: Number(invoice.recurring_total) || 0,
      onetime_total: Number(invoice.onetime_total) || 0,
      grand_total: Number(invoice.grand_total) || 0
    }));

    res.json(invoices);
  } catch (error) {
    console.error("Error fetching invoices:", error);
    res.status(500).json({ error: error.message, invoices: [] });
  }
});

// ✅ Fetch tiered pricing for a given partner billing ID
app.get("/api/billing-tiers/:partnerBillingId", async (req, res) => {
  try {
    const { partnerBillingId } = req.params;
    const result = await pool.query(
      "SELECT * FROM billing_tiers WHERE partner_billing_id = $1 ORDER BY tier_min ASC",
      [partnerBillingId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching billing tiers:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Create new tiered pricing for a partner billing item
app.post("/api/billing-tiers", async (req, res) => {
  try {
    const { partner_billing_id, tier_min, tier_max, per_employee_rate } = req.body;
    
    const result = await pool.query(
      "INSERT INTO billing_tiers (partner_billing_id, tier_min, tier_max, per_employee_rate) VALUES ($1, $2, $3, $4) RETURNING *",
      [partner_billing_id, tier_min, tier_max, per_employee_rate]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating billing tier:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Update an existing tier
app.put("/api/billing-tiers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { tier_min, tier_max, per_employee_rate } = req.body;

    const result = await pool.query(
      "UPDATE billing_tiers SET tier_min = $1, tier_max = $2, per_employee_rate = $3 WHERE id = $4 RETURNING *",
      [tier_min, tier_max, per_employee_rate, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Tier not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating billing tier:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// ✅ Delete a tier
app.delete("/api/billing-tiers/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM billing_tiers WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Tier not found" });
    }

    res.json({ message: "Tier deleted successfully" });
  } catch (error) {
    console.error("Error deleting billing tier:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

//user routes
const userRoutes = require("./userRoutes");
app.use("/api", userRoutes);



// Start server
app.listen(port, () => {
  console.log(`✅ Server running on port ${port}`);
});




