import React, { useState, useEffect } from 'react';
import { Search, Calendar, User, FileText, Loader2, AlertCircle } from 'lucide-react';
import { db } from '../lib/database';
import type { PatientSearchRecord } from '../lib/database';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

export const PatientHistory: React.FC = () => {
  const [patients, setPatients] = useState<PatientSearchRecord[]>([]);
  const [filteredPatients, setFilteredPatients] = useState<PatientSearchRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [searchTerm, patients]);

  const loadPatients = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await db.getAllPatientSearches();
      
      if (result.success && result.data) {
        setPatients(result.data);
        setFilteredPatients(result.data);
      } else {
        setError(result.error || 'Failed to load patient history');
      }
    } catch (error) {
      console.error('Error loading patients:', error);
      setError('An unexpected error occurred while loading patient history');
    } finally {
      setIsLoading(false);
    }
  };

  const filterPatients = () => {
    if (!searchTerm.trim()) {
      setFilteredPatients(patients);
      return;
    }

    const filtered = patients.filter(patient =>
      patient.patient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.member_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.date_of_birth.includes(searchTerm)
    );

    setFilteredPatients(filtered);
  };

  const formatDate = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MM/dd/yyyy');
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateString: string): string => {
    try {
      return format(new Date(dateString), 'MM/dd/yyyy HH:mm');
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-800 mx-auto mb-4" />
          <p className="text-neutral-600">Loading patient history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-8 h-8 text-error-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-neutral-900 mb-2">Error Loading History</h3>
        <p className="text-neutral-600 mb-4">{error}</p>
        <button
          onClick={loadPatients}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-grotesk text-neutral-900">Patient History</h1>
          <p className="text-neutral-600 mt-2">View and manage all previous patient searches</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary-800">{patients.length}</p>
          <p className="text-sm text-neutral-500">Total Searches</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card p-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by patient name, member ID, or date of birth..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        
        {searchTerm && (
          <div className="mt-4 text-sm text-neutral-600">
            Showing {filteredPatients.length} of {patients.length} results
          </div>
        )}
      </div>

      {/* Patient List */}
      {filteredPatients.length === 0 ? (
        <div className="card p-8 text-center">
          <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">
            {searchTerm ? 'No Search Results' : 'No Patient History'}
          </h3>
          <p className="text-neutral-600">
            {searchTerm 
              ? 'No patients found matching your search criteria.' 
              : 'Patient searches will appear here once you perform eligibility searches.'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="btn-ghost mt-4"
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <Link
              key={patient.id}
              to={`/patient/${patient.id}`}
              className="card p-6 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] block"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <User className="w-8 h-8 text-primary-800 bg-primary-50 rounded-full p-1.5" />
                  <div>
                    <h3 className="font-semibold text-neutral-900 font-grotesk">
                      {patient.patient_name}
                    </h3>
                    <p className="text-sm text-neutral-500">
                      ID: {patient.member_id}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="status-badge status-active">
                    Active
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm text-neutral-600">
                  <Calendar className="w-4 h-4" />
                  <span>DOB: {formatDate(patient.date_of_birth)}</span>
                </div>
                
                <div className="flex items-center space-x-2 text-sm text-neutral-600">
                  <Search className="w-4 h-4" />
                  <span>Searched: {formatDateTime(patient.search_date)}</span>
                </div>
                
                <div className="pt-3 border-t border-neutral-100">
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>Click to view details</span>
                    <FileText className="w-3 h-3" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Load More Button (if needed for pagination) */}
      {filteredPatients.length > 0 && patients.length > filteredPatients.length && (
        <div className="text-center pt-6">
          <button className="btn-secondary">
            Load More Results
          </button>
        </div>
      )}
    </div>
  );
};