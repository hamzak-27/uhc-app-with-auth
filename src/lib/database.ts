import { supabase } from './supabase';
import type { Database } from './supabase';

type PatientSearch = Database['public']['Tables']['patient_searches']['Row'];
type PatientSearchInsert = Database['public']['Tables']['patient_searches']['Insert'];

export interface PatientSearchRecord {
  id: string;
  member_id: string;
  patient_name: string;
  date_of_birth: string;
  search_date: string;
  eligibility_data: any;
  coverage_data?: any;
  member_card_data?: any;
  created_at: string;
  updated_at: string;
}

class DatabaseService {
  async savePatientSearch(data: PatientSearchInsert): Promise<{ success: boolean; data?: PatientSearch; error?: string }> {
    try {
      const { data: result, error } = await supabase
        .from('patient_searches')
        .insert(data)
        .select()
        .single();

      if (error) {
        console.error('Database insert error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Database service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown database error' 
      };
    }
  }

  async getAllPatientSearches(): Promise<{ success: boolean; data?: PatientSearch[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('patient_searches')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database select error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Database service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown database error' 
      };
    }
  }

  async getPatientSearchById(id: string): Promise<{ success: boolean; data?: PatientSearch; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('patient_searches')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Database select error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Database service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown database error' 
      };
    }
  }

  async searchPatients(query: string): Promise<{ success: boolean; data?: PatientSearch[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('patient_searches')
        .select('*')
        .or(`patient_name.ilike.%${query}%,member_id.ilike.%${query}%`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Database search error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data: data || [] };
    } catch (error) {
      console.error('Database service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown database error' 
      };
    }
  }

  async updatePatientSearch(id: string, updates: Partial<PatientSearchInsert>): Promise<{ success: boolean; data?: PatientSearch; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('patient_searches')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Database update error:', error);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      console.error('Database service error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown database error' 
      };
    }
  }
}

export const db = new DatabaseService();