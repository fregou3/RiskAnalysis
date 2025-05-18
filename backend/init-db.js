const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Initialize PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

async function initializeDatabase() {
  try {
    // Create suppliers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        contact TEXT,
        industry VARCHAR(100),
        risk_score NUMERIC(3,1),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Suppliers table created or already exists');

    // Create risk_assessments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS risk_assessments (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER REFERENCES suppliers(id),
        assessment_date DATE NOT NULL,
        financial_risk NUMERIC(3,1),
        operational_risk NUMERIC(3,1),
        compliance_risk NUMERIC(3,1),
        reputational_risk NUMERIC(3,1),
        overall_risk NUMERIC(3,1),
        notes TEXT,
        assessed_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Risk assessments table created or already exists');

    // Create risk_factors table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS risk_factors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        weight NUMERIC(3,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Risk factors table created or already exists');

    // Create assessment_details table to link risk_assessments with risk_factors
    await pool.query(`
      CREATE TABLE IF NOT EXISTS assessment_details (
        id SERIAL PRIMARY KEY,
        assessment_id INTEGER REFERENCES risk_assessments(id),
        factor_id INTEGER REFERENCES risk_factors(id),
        score NUMERIC(3,1),
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Assessment details table created or already exists');

    // Insert some sample risk factors
    await pool.query(`
      INSERT INTO risk_factors (name, description, category, weight)
      VALUES 
        ('Financial Stability', 'Supplier''s financial health and stability', 'Financial', 0.25),
        ('Operational Capability', 'Supplier''s ability to deliver products/services', 'Operational', 0.20),
        ('Regulatory Compliance', 'Supplier''s compliance with relevant regulations', 'Compliance', 0.20),
        ('Reputation', 'Supplier''s market reputation and public image', 'Reputational', 0.15),
        ('Geographic Risk', 'Risk associated with supplier''s geographic location', 'Operational', 0.10),
        ('Cybersecurity Posture', 'Supplier''s information security measures', 'Operational', 0.10)
      ON CONFLICT (id) DO NOTHING
    `);
    console.log('Sample risk factors inserted');

    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  } finally {
    // Close the pool
    await pool.end();
  }
}

// Run the initialization
initializeDatabase();
