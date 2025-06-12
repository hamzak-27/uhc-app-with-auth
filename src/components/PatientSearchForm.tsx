import React, { useState } from 'react';
import { Search, Loader2, AlertCircle, RotateCcw } from 'lucide-react';
import { uhcApi } from '../lib/uhc-api-backend';
import { db } from '../lib/database';
import { format } from 'date-fns';

interface PatientSearchFormProps {
  onSearchComplete: (results: any) => void;
}

export const PatientSearchForm: React.FC<PatientSearchFormProps> = ({ onSearchComplete }) => {
  const [formData, setFormData] = useState({
    memberId: '',
    dateOfBirth: '',
    firstName: '',
    lastName: '',
    payerId: '',
    providerLastName: '',
    taxIdNumber: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleClearData = () => {
    setFormData({
      memberId: '',
      dateOfBirth: '',
      firstName: '',
      lastName: '',
      payerId: '',
      providerLastName: '',
      taxIdNumber: ''
    });
    setError(null);
  };

  const formatDateOfBirth = (dateString: string): string => {
    // Convert MM/DD/YYYY to YYYY-MM-DD for API
    const parts = dateString.split('/');
    if (parts.length === 3) {
      const [month, day, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return dateString;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.memberId || !formData.dateOfBirth) {
      setError('Member ID and Date of Birth are required');
      return;
    }

    // Check if token is valid
    const tokenInfo = uhcApi.getTokenInfo();
    if (!tokenInfo.isValid) {
      setError('OAuth token is required. Please generate a token first.');
      return;
    }

    setIsLoading(true);

    try {
      // Search eligibility
      const eligibilityResult = await uhcApi.searchEligibility({
        memberId: formData.memberId,
        dateOfBirth: formatDateOfBirth(formData.dateOfBirth),
        firstName: formData.firstName,
        lastName: formData.lastName,
        payerId: formData.payerId,
        providerLastName: formData.providerLastName,
        taxIdNumber: formData.taxIdNumber
      });

      if (!eligibilityResult.success) {
        throw new Error(eligibilityResult.error?.message || 'Failed to search eligibility');
      }

      const eligibilityData = eligibilityResult.data;
      let coverageData = null;
      let memberCardData = null;

      // Extract patient information for display and database storage
      const patientInfo = eligibilityData?.memberPolicies?.[0]?.patientInfo?.[0];
      const patientName = patientInfo ? 
        `${patientInfo.firstName || ''} ${patientInfo.middleName || ''} ${patientInfo.lastName || ''}`.trim() :
        'Unknown Patient';

      // Try to get coverage details
      if (eligibilityData?.memberPolicies?.[0]) {
        const policy = eligibilityData.memberPolicies[0];
        const patientKey = patientInfo?.patientKey;
        const transactionId = policy.transactionId;

        if (patientKey && transactionId) {
          const coverageResult = await uhcApi.getCoverageDetails(patientKey, transactionId);
          if (coverageResult.success) {
            coverageData = coverageResult.data;
          }

          // Try to get member card
          const insuranceInfo = policy.insuranceInfo;
          if (insuranceInfo?.memberId && insuranceInfo?.payerId && patientInfo?.firstName) {
            const memberCardResult = await uhcApi.getMemberCard(
              transactionId,
              insuranceInfo.memberId,
              formatDateOfBirth(formData.dateOfBirth),
              insuranceInfo.payerId,
              patientInfo.firstName
            );
            if (memberCardResult.success) {
              memberCardData = memberCardResult.data;
            }
          }
        }
      }

      // Save to database
      const searchRecord = {
        member_id: formData.memberId,
        patient_name: patientName,
        date_of_birth: formData.dateOfBirth,
        search_date: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        eligibility_data: eligibilityData,
        coverage_data: coverageData,
        member_card_data: memberCardData
      };

      const dbResult = await db.savePatientSearch(searchRecord);
      if (!dbResult.success) {
        console.warn('Failed to save search to database:', dbResult.error);
      }

      // Return all results
      onSearchComplete({
        eligibility: eligibilityData,
        coverage: coverageData,
        memberCard: memberCardData,
        patientName,
        searchId: dbResult.data?.id
      });

    } catch (error) {
      console.error('Search error:', error);
      setError(error instanceof Error ? error.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card p-8 animate-in">
      <div className="flex items-center space-x-3 mb-6">
        <Search className="w-6 h-6 text-primary-800" />
        <h2 className="text-2xl font-bold font-grotesk text-neutral-900">Patient Eligibility Search</h2>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error-50 border border-error-200 rounded-lg flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-error-600 mt-0.5" />
          <div>
            <p className="text-error-700 font-medium">Search Error</p>
            <p className="text-error-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Required Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="memberId" className="block text-sm font-medium text-neutral-700 mb-2">
              Member ID *
            </label>
            <input
              type="text"
              id="memberId"
              name="memberId"
              value={formData.memberId}
              onChange={handleInputChange}
              className="input-field"
              placeholder="Enter member ID"
              required
            />
          </div>
          
          <div>
            <label htmlFor="dateOfBirth" className="block text-sm font-medium text-neutral-700 mb-2">
              Date of Birth *
            </label>
            <input
              type="text"
              id="dateOfBirth"
              name="dateOfBirth"
              value={formData.dateOfBirth}
              onChange={handleInputChange}
              className="input-field"
              placeholder="MM/DD/YYYY"
              required
            />
          </div>
        </div>

        {/* Optional Fields */}
        <div className="border-t border-neutral-200 pt-6">
          <h3 className="font-medium text-neutral-900 mb-4">Optional Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-neutral-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter first name"
              />
            </div>
            
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-neutral-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter last name"
              />
            </div>
            
            <div>
              <label htmlFor="payerId" className="block text-sm font-medium text-neutral-700 mb-2">
                Payer ID
              </label>
              <input
                type="text"
                id="payerId"
                name="payerId"
                value={formData.payerId}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter payer ID"
              />
            </div>
            
            <div>
              <label htmlFor="providerLastName" className="block text-sm font-medium text-neutral-700 mb-2">
                Provider Last Name
              </label>
              <input
                type="text"
                id="providerLastName"
                name="providerLastName"
                value={formData.providerLastName}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter provider last name"
              />
            </div>
            
            <div>
              <label htmlFor="taxIdNumber" className="block text-sm font-medium text-neutral-700 mb-2">
                Tax ID Number
              </label>
              <input
                type="text"
                id="taxIdNumber"
                name="taxIdNumber"
                value={formData.taxIdNumber}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Enter tax ID"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-6">
          <button
            type="button"
            onClick={handleClearData}
            className="inline-flex items-center px-4 py-2 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            <span>Clear Data</span>
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary flex items-center space-x-2 min-w-[160px] justify-center"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Search Eligibility</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};