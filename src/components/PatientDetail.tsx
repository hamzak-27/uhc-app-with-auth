import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Loader2, AlertCircle } from 'lucide-react';
import { db } from '../lib/database';
import { PDFGenerator } from '../lib/pdf-generator';
import { PatientResults } from './PatientResults';
import type { PatientSearchRecord } from '../lib/database';

export const PatientDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<PatientSearchRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadPatientDetails(id);
    }
  }, [id]);

  const loadPatientDetails = async (patientId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await db.getPatientSearchById(patientId);
      
      if (result.success && result.data) {
        setPatient(result.data);
      } else {
        setError(result.error || 'Patient not found');
      }
    } catch (error) {
      console.error('Error loading patient details:', error);
      setError('An unexpected error occurred while loading patient details');
    } finally {
      setIsLoading(false);
    }
  };



  const handleDownloadPDF = async () => {
    if (!patient) return;

    try {
      const pdfData = {
        patientName: patient.patient_name,
        memberId: patient.member_id,
        dateOfBirth: patient.date_of_birth,
        searchDate: patient.search_date,
        eligibilityData: patient.eligibility_data,
        coverageData: patient.coverage_data
      };

      await PDFGenerator.generatePatientReport(pdfData);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary-800 mx-auto mb-4" />
          <p className="text-neutral-600">Loading patient details...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-4">
          <Link to="/history" className="btn-ghost flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to History</span>
          </Link>
        </div>

        <div className="card p-8 text-center">
          <AlertCircle className="w-8 h-8 text-error-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 mb-2">Patient Not Found</h3>
          <p className="text-neutral-600 mb-4">{error || 'The requested patient record could not be found.'}</p>
          <Link to="/history" className="btn-primary">
            Return to History
          </Link>
        </div>
      </div>
    );
  }

  // Prepare results data for PatientResults component
  const resultsData = {
    eligibility: patient.eligibility_data,
    coverage: patient.coverage_data,
    memberCard: patient.member_card_data,
    patientName: patient.patient_name,
    searchId: patient.id
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/history" className="btn-ghost flex items-center space-x-2">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to History</span>
          </Link>
          
          <div>
            <h1 className="text-3xl font-bold font-grotesk text-neutral-900">
              {patient.patient_name}
            </h1>
            <p className="text-neutral-600 mt-1">
              Member ID: {patient.member_id} • DOB: {patient.date_of_birth}
            </p>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            onClick={handleDownloadPDF}
            className="btn-primary flex items-center space-x-2"
          >
            <Download className="w-4 h-4" />
            <span>Download PDF</span>
          </button>
        </div>
      </div>

      {/* Search Info */}
      <div className="card p-4 bg-neutral-50 border-neutral-200">
        <div className="flex items-center justify-between text-sm text-neutral-600">
          <span>Search performed on: {new Date(patient.search_date).toLocaleString()}</span>
          <span>Last updated: {new Date(patient.updated_at).toLocaleString()}</span>
        </div>
      </div>

      {/* Patient Results */}
      <div id="patient-detail-content">
        <PatientResults results={resultsData} />
      </div>
    </div>
  );
};