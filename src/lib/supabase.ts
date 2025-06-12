import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      patient_searches: {
        Row: {
          id: string;
          member_id: string;
          patient_name: string;
          date_of_birth: string;
          search_date: string;
          eligibility_data: any;
          coverage_data: any;
          member_card_data: any;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          member_id: string;
          patient_name: string;
          date_of_birth: string;
          search_date: string;
          eligibility_data: any;
          coverage_data?: any;
          member_card_data?: any;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          member_id?: string;
          patient_name?: string;
          date_of_birth?: string;
          search_date?: string;
          eligibility_data?: any;
          coverage_data?: any;
          member_card_data?: any;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};