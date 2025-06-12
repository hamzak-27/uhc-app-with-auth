/*
  # Create patient searches table

  1. New Tables
    - `patient_searches`
      - `id` (uuid, primary key)
      - `member_id` (text, member ID from UHC)
      - `patient_name` (text, full patient name)
      - `date_of_birth` (text, patient DOB in MM/DD/YYYY format)
      - `search_date` (text, when the search was performed)
      - `eligibility_data` (jsonb, complete eligibility response from UHC API)
      - `coverage_data` (jsonb, coverage details from UHC API, nullable)
      - `member_card_data` (jsonb, member card data from UHC API, nullable)
      - `created_at` (timestamptz, record creation time)
      - `updated_at` (timestamptz, record update time)

  2. Security
    - Enable RLS on `patient_searches` table
    - Add policy for all users to read/write their data (public access for healthcare app)

  3. Indexes
    - Index on member_id for fast searches
    - Index on patient_name for text searches
    - Index on search_date for chronological queries
*/

CREATE TABLE IF NOT EXISTS patient_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id text NOT NULL,
  patient_name text NOT NULL DEFAULT '',
  date_of_birth text NOT NULL DEFAULT '',
  search_date text NOT NULL DEFAULT '',
  eligibility_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  coverage_data jsonb DEFAULT NULL,
  member_card_data jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE patient_searches ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (healthcare application)
CREATE POLICY "Allow all operations for patient searches"
  ON patient_searches
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_patient_searches_member_id 
  ON patient_searches(member_id);

CREATE INDEX IF NOT EXISTS idx_patient_searches_patient_name 
  ON patient_searches USING gin(to_tsvector('english', patient_name));

CREATE INDEX IF NOT EXISTS idx_patient_searches_search_date 
  ON patient_searches(search_date);

CREATE INDEX IF NOT EXISTS idx_patient_searches_created_at 
  ON patient_searches(created_at DESC);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patient_searches_updated_at
  BEFORE UPDATE ON patient_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();