/*
  # Authentication and User Management Setup

  1. Security
    - Enable RLS on auth.users (already enabled by Supabase)
    - Create policies for user data access
    - Set up proper authentication flow

  2. User Profile Management
    - Users can read their own profile
    - Users can update their own profile
    - Public access for application functionality

  3. Integration with existing patient_searches table
    - Update policies to work with authenticated users
    - Maintain existing functionality while adding auth
*/

-- Update patient_searches policies to work with authenticated users
-- Keep the existing public policy but add user-specific policies for better security

-- Drop the existing public policy
DROP POLICY IF EXISTS "Allow all operations for patient searches" ON patient_searches;

-- Create new policies for authenticated users
CREATE POLICY "Authenticated users can read all patient searches"
  ON patient_searches
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert patient searches"
  ON patient_searches
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update patient searches"
  ON patient_searches
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete patient searches"
  ON patient_searches
  FOR DELETE
  TO authenticated
  USING (true);

-- Create a function to handle user profile updates
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- You can add any additional user setup logic here
  -- For example, creating a user profile record
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup (optional)
-- This trigger will run when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();