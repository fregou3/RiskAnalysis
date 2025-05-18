-- Schéma pour l'application RiskAnalysis

-- Table pour stocker les informations des entreprises
CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  siren VARCHAR(9) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  legal_form VARCHAR(255),
  creation_date DATE,
  address TEXT,
  postal_code VARCHAR(10),
  city VARCHAR(100),
  country VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table pour stocker les données financières des entreprises
CREATE TABLE IF NOT EXISTS financial_data (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  revenue DECIMAL(15, 2),
  net_income DECIMAL(15, 2),
  gross_margin DECIMAL(15, 2),
  ebitda DECIMAL(15, 2),
  employees INTEGER,
  growth_rate DECIMAL(8, 2),
  gross_margin_rate DECIMAL(8, 2),
  ebitda_margin DECIMAL(8, 2),
  economic_profitability DECIMAL(8, 2),
  financial_profitability DECIMAL(8, 2),
  working_capital DECIMAL(15, 2),
  cash_flow DECIMAL(15, 2),
  net_cash DECIMAL(15, 2),
  customer_payment_time INTEGER,
  supplier_payment_time INTEGER,
  debt_ratio DECIMAL(8, 2),
  financial_autonomy DECIMAL(8, 2),
  leverage_ratio DECIMAL(8, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(company_id, year)
);

-- Table pour stocker les analyses de risque
CREATE TABLE IF NOT EXISTS risk_analyses (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  analysis_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_input TEXT,
  openai_response TEXT,
  anthropic_response TEXT,
  deepseek_response TEXT,
  gemini_response TEXT,
  reasoning TEXT,
  pdf_export_path VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table pour stocker l'historique des recherches
CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
  search_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  search_term VARCHAR(255),
  search_type VARCHAR(50),
  user_ip VARCHAR(45),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Table pour stocker les paramètres utilisateur
CREATE TABLE IF NOT EXISTS user_preferences (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(100) UNIQUE NOT NULL,
  default_model VARCHAR(50),
  default_country VARCHAR(100),
  theme VARCHAR(20),
  language VARCHAR(10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_companies_siren ON companies(siren);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);
CREATE INDEX IF NOT EXISTS idx_financial_data_company_id ON financial_data(company_id);
CREATE INDEX IF NOT EXISTS idx_financial_data_year ON financial_data(year);
CREATE INDEX IF NOT EXISTS idx_risk_analyses_company_id ON risk_analyses(company_id);
CREATE INDEX IF NOT EXISTS idx_search_history_company_id ON search_history(company_id);
CREATE INDEX IF NOT EXISTS idx_search_history_search_date ON search_history(search_date);
