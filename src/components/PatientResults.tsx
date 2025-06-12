import React, { useState } from 'react';
import { FileText, Download, Printer, CreditCard, Calendar, MapPin, Phone, X, Info, AlertCircle } from 'lucide-react';
import { uhcApi } from '../lib/uhc-api-backend';

interface PatientResultsProps {
  results: {
    eligibility: any;
    coverage?: any;
    memberCard?: any;
    patientName: string;
    searchId?: string;
  };
}

export const PatientResults: React.FC<PatientResultsProps> = ({ results }) => {
  const { eligibility, coverage, memberCard, patientName } = results;
  const [showMemberCardModal, setShowMemberCardModal] = useState(false);
  const [memberCardData, setMemberCardData] = useState<any>(null);
  const [isLoadingMemberCard, setIsLoadingMemberCard] = useState(false);
  const [memberCardError, setMemberCardError] = useState<string | null>(null);

  const formatDate = (dateString: string): string => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US');
    } catch {
      return dateString;
    }
  };

  const handlePrintResults = () => {
    try {
      window.print();
    } catch (error) {
      console.error('Print error:', error);
      alert('Failed to print results. Please try again.');
    }
  };

  const handleDownloadPDF = async () => {
    try {
      // Create a simple text-based report for download
      const policy = eligibility?.memberPolicies?.[0];
      const patientInfo = policy?.patientInfo?.[0];
      const insuranceInfo = policy?.insuranceInfo;
      
      const reportContent = `
UHC Patient Eligibility Report
Generated: ${new Date().toLocaleString()}

PATIENT INFORMATION
Name: ${patientName}
Member ID: ${insuranceInfo?.memberId || 'N/A'}
Date of Birth: ${formatDate(patientInfo?.dateOfBirth)}
Gender: ${patientInfo?.gender || 'N/A'}

INSURANCE INFORMATION
Payer Name: ${insuranceInfo?.payerName || 'N/A'}
Plan Description: ${insuranceInfo?.planDescription || 'N/A'}
Group Number: ${insuranceInfo?.groupNumber || 'N/A'}
Policy Status: ${policy?.policyInfo?.policyStatus || 'N/A'}

ADDRESS
${patientInfo?.addressLine1 || 'N/A'}
${patientInfo?.addressLine2 ? patientInfo.addressLine2 + '\n' : ''}${patientInfo?.city || 'N/A'}, ${patientInfo?.state || 'N/A'} ${patientInfo?.zip || 'N/A'}
      `;

      const blob = new Blob([reportContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `patient_report_${insuranceInfo?.memberId || 'unknown'}_${new Date().toISOString().split('T')[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  const handleViewMemberCard = async () => {
    try {
      console.log('🆔 View Member Card button clicked');
      
      const policy = eligibility?.memberPolicies?.[0];
      const patientInfo = policy?.patientInfo?.[0];
      const insuranceInfo = policy?.insuranceInfo;
      
      const transactionId = policy?.transactionId;
      const memberId = insuranceInfo?.memberId;
      const payerId = insuranceInfo?.payerId;
      const firstName = patientInfo?.firstName;
      const dateOfBirth = patientInfo?.dateOfBirth;

      console.log('📋 Member card request data:', {
        transactionId,
        memberId,
        payerId,
        firstName,
        dateOfBirth
      });

      // Validate required fields
      if (!transactionId || !memberId || !payerId || !firstName || !dateOfBirth) {
        const missingFields = [];
        if (!transactionId) missingFields.push('transaction ID');
        if (!memberId) missingFields.push('member ID');
        if (!payerId) missingFields.push('payer ID');
        if (!firstName) missingFields.push('first name');
        if (!dateOfBirth) missingFields.push('date of birth');
        
        const errorMessage = `Cannot retrieve member card. Missing required fields: ${missingFields.join(', ')}`;
        console.error('❌ Member card validation failed:', errorMessage);
        setMemberCardError(errorMessage);
        setShowMemberCardModal(true);
        return;
      }

      setIsLoadingMemberCard(true);
      setMemberCardError(null);
      setMemberCardData(null);
      setShowMemberCardModal(true);

      console.log('🔄 Making member card API call...');
      const result = await uhcApi.getMemberCard(
        transactionId,
        memberId,
        dateOfBirth,
        payerId,
        firstName
      );

      console.log('📥 Member card API response:', {
        success: result.success,
        hasData: !!result.data,
        error: result.error
      });

      if (result.success) {
        console.log('✅ Member card data received:', {
          hasImageData: !!result.data?.imageData,
          imageDataLength: result.data?.imageData?.length || 0,
          contentType: result.data?.contentType,
          hasMessage: !!result.data?.message
        });
        setMemberCardData(result.data);
      } else {
        const errorMessage = result.error?.message || 'Failed to retrieve member card';
        console.error('❌ Member card API failed:', errorMessage);
        setMemberCardError(errorMessage);
      }
    } catch (error) {
      const errorMessage = `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('❌ Member card exception:', error);
      setMemberCardError(errorMessage);
    } finally {
      setIsLoadingMemberCard(false);
      console.log('🏁 Member card loading finished');
    }
  };

  const closeMemberCardModal = () => {
    setShowMemberCardModal(false);
    setMemberCardData(null);
    setMemberCardError(null);
  };

  const downloadMemberCard = () => {
    try {
      if (memberCardData?.imageData) {
        console.log('📥 Starting member card download...');
        const policy = eligibility?.memberPolicies?.[0];
        
        // Convert array of bytes to Uint8Array for blob creation
        const uint8Array = new Uint8Array(memberCardData.imageData);
        const blob = new Blob([uint8Array], { 
          type: memberCardData.contentType || 'image/png' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `member_card_${policy?.insuranceInfo?.memberId || 'unknown'}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('✅ Member card download completed');
      } else {
        console.warn('⚠️ No image data available for download');
        alert('No image data available for download');
      }
    } catch (error) {
      console.error('❌ Download failed:', error);
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (!eligibility?.memberPolicies?.length) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
        <p className="text-gray-600">No member policies were found for the provided search criteria.</p>
      </div>
    );
  }

  const policy = eligibility.memberPolicies[0];
  const patientInfo = policy.patientInfo?.[0];
  const insuranceInfo = policy.insuranceInfo;
  const policyInfo = policy.policyInfo;

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Patient Results</h2>
        <div className="flex space-x-3">
          <button
            onClick={handlePrintResults}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </button>
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Report
          </button>
        </div>
      </div>

      <div id="patient-results-content" className="space-y-6">
        {/* Member Card Display */}
        {memberCard && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <CreditCard className="w-4 h-4 text-blue-600" />
              <h3 className="text-base font-semibold">Member Card</h3>
            </div>
            
            {memberCard.imageData ? (
              <div className="text-center">
                <img
                  src={`data:${memberCard.contentType};base64,${btoa(
                    Array.from(new Uint8Array(memberCard.imageData), byte => String.fromCharCode(byte)).join('')
                  )}`}
                  alt="UHC Member Card"
                  className="max-w-sm h-auto border border-gray-200 rounded-lg shadow-sm mx-auto"
                />
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <CreditCard className="w-6 h-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Member card not available</p>
              </div>
            )}
          </div>
        )}

        {/* Patient Demographics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <span>Patient Demographics</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Full Name</p>
              <p className="text-gray-900 font-medium">{patientName}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Date of Birth</p>
              <p className="text-gray-900">{formatDate(patientInfo?.dateOfBirth)}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Gender</p>
              <p className="text-gray-900">{patientInfo?.gender || 'N/A'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Member ID</p>
              <p className="text-gray-900 font-mono">{insuranceInfo?.memberId || 'N/A'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Relationship</p>
              <p className="text-gray-900">{patientInfo?.relationship || 'N/A'}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Subscriber</p>
              <p className="text-gray-900">
                {patientInfo?.subscriberBoolean ? 'Yes' : 'No'}
              </p>
            </div>
          </div>

          {/* Address */}
          {patientInfo?.addressLine1 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center space-x-2 mb-3">
                <MapPin className="w-4 h-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-500">Address</p>
              </div>
              <p className="text-gray-900">
                {patientInfo.addressLine1}
                {patientInfo.addressLine2 && `, ${patientInfo.addressLine2}`}
                <br />
                {patientInfo.city}, {patientInfo.state} {patientInfo.zip}
              </p>
            </div>
          )}


        </div>

        {/* Insurance Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">Insurance Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Payer Name</p>
                <p className="text-gray-900 font-medium">{insuranceInfo?.payerName || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Plan Description</p>
                <p className="text-gray-900">{insuranceInfo?.planDescription || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Group Number</p>
                <p className="text-gray-900 font-mono">{insuranceInfo?.groupNumber || 'N/A'}</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Insurance Type</p>
                <p className="text-gray-900">{insuranceInfo?.insuranceType || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Line of Business</p>
                <p className="text-gray-900">{insuranceInfo?.lineOfBusiness || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Payer ID</p>
                <p className="text-gray-900 font-mono">{insuranceInfo?.payerId || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Policy Information */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Policy Information</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Policy Status</p>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                policyInfo?.policyStatus === 'Active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {policyInfo?.policyStatus || 'N/A'}
              </span>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500 mb-1">Coverage Type</p>
              <p className="text-gray-900">{policyInfo?.coverageType || 'N/A'}</p>
            </div>
            
            {policyInfo?.eligibilityDates && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Eligibility Period</p>
                <p className="text-gray-900">
                  {formatDate(policyInfo.eligibilityDates.startDate)} - {formatDate(policyInfo.eligibilityDates.endDate)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Deductible Information */}
        {policy.deductibleInfo?.found && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Deductible Information</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Met YTD</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {policy.deductibleInfo.individual?.found && (
                    <>
                      {policy.deductibleInfo.individual.inNetwork?.found && (
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Individual In-Network</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.deductibleInfo.individual.inNetwork.planAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.deductibleInfo.individual.inNetwork.remainingAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.deductibleInfo.individual.inNetwork.metYtdAmount || '0'}</td>
                        </tr>
                      )}
                      {policy.deductibleInfo.individual.outOfNetwork?.found && (
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Individual Out-of-Network</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.deductibleInfo.individual.outOfNetwork.planAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.deductibleInfo.individual.outOfNetwork.remainingAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.deductibleInfo.individual.outOfNetwork.metYtdAmount || '0'}</td>
                        </tr>
                      )}
                    </>
                  )}
                  
                  {policy.deductibleInfo.family?.found && (
                    <>
                      {policy.deductibleInfo.family.inNetwork?.found && (
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Family In-Network</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.deductibleInfo.family.inNetwork.planAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.deductibleInfo.family.inNetwork.remainingAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.deductibleInfo.family.inNetwork.metYtdAmount || '0'}</td>
                        </tr>
                      )}
                      {policy.deductibleInfo.family.outOfNetwork?.found && (
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Family Out-of-Network</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.deductibleInfo.family.outOfNetwork.planAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.deductibleInfo.family.outOfNetwork.remainingAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.deductibleInfo.family.outOfNetwork.metYtdAmount || '0'}</td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Out-of-Pocket Information */}
        {policy.outOfPocketInfo?.found && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Out-of-Pocket Information</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Met YTD</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {policy.outOfPocketInfo.individual?.found && (
                    <>
                      {policy.outOfPocketInfo.individual.inNetwork?.found && (
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Individual In-Network</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.outOfPocketInfo.individual.inNetwork.planAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.outOfPocketInfo.individual.inNetwork.remainingAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.outOfPocketInfo.individual.inNetwork.metYtdAmount || '0'}</td>
                        </tr>
                      )}
                      {policy.outOfPocketInfo.individual.outOfNetwork?.found && (
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Individual Out-of-Network</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.outOfPocketInfo.individual.outOfNetwork.planAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.outOfPocketInfo.individual.outOfNetwork.remainingAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.outOfPocketInfo.individual.outOfNetwork.metYtdAmount || '0'}</td>
                        </tr>
                      )}
                    </>
                  )}
                  
                  {policy.outOfPocketInfo.family?.found && (
                    <>
                      {policy.outOfPocketInfo.family.inNetwork?.found && (
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Family In-Network</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.outOfPocketInfo.family.inNetwork.planAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.outOfPocketInfo.family.inNetwork.remainingAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.outOfPocketInfo.family.inNetwork.metYtdAmount || '0'}</td>
                        </tr>
                      )}
                      {policy.outOfPocketInfo.family.outOfNetwork?.found && (
                        <tr>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">Family Out-of-Network</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.outOfPocketInfo.family.outOfNetwork.planAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.outOfPocketInfo.family.outOfNetwork.remainingAmount || '0'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${policy.outOfPocketInfo.family.outOfNetwork.metYtdAmount || '0'}</td>
                        </tr>
                      )}
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Coverage Details */}
        {coverage?.CopayCoInsuranceDetails && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Coverage Details</h3>
            
            {coverage.CopayCoInsuranceDetails.individual?.inNetwork?.services && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">In-Network Services</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Service</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Copay</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Coinsurance</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {coverage.CopayCoInsuranceDetails.individual.inNetwork.services
                        .filter((service: any) => service.found)
                        .map((service: any, index: number) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{service.text || service.service || 'N/A'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                service.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {service.status || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${service.coPayAmount || '0'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{service.coInsurancePercent || '0'}%</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Primary Care Physician */}
        {policy.primaryCarePhysicianInfo?.pcpFound === 'true' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
              <Phone className="w-5 h-5 text-blue-600" />
              <span>Primary Care Physician</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Physician Name</p>
                <p className="text-gray-900 font-medium">
                  {`${policy.primaryCarePhysicianInfo.firstName || ''} ${policy.primaryCarePhysicianInfo.middleName || ''} ${policy.primaryCarePhysicianInfo.lastName || ''}`.trim() || 'N/A'}
                </p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Provider Group</p>
                <p className="text-gray-900">{policy.primaryCarePhysicianInfo.providerGroupName || 'N/A'}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Network Status</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  policy.primaryCarePhysicianInfo.networkStatusCode === 'I' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {policy.primaryCarePhysicianInfo.networkStatusCode === 'I' ? 'In-Network' : 'Out-of-Network'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Member Card Modal */}
      {showMemberCardModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <CreditCard className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900">Member Card</h3>
              </div>
              <button
                onClick={closeMemberCardModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {isLoadingMemberCard && (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Fetching member card...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                </div>
              )}

              {memberCardError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-red-700 font-medium">Failed to retrieve member card</p>
                      <p className="text-red-600 text-sm mt-1">{memberCardError}</p>
                    </div>
                  </div>
                </div>
              )}

              {memberCardData && !isLoadingMemberCard && (
                <div className="space-y-6">
                  {/* Success message */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-5 h-5 text-green-500">✅</div>
                      <p className="text-green-700 font-medium">Member card retrieved successfully!</p>
                    </div>
                  </div>

                  {/* Member Card Image */}
                  {memberCardData.imageData && (
                    <div className="text-center">
                      <div className="border-2 border-blue-200 rounded-lg p-6 bg-blue-50">
                        <h4 className="text-lg font-medium text-blue-800 mb-4">UHC Member Card</h4>
                        {(() => {
                          try {
                            // Safely convert image data to base64
                            const base64Data = btoa(Array.from(memberCardData.imageData, (byte: number) => String.fromCharCode(byte)).join(''));
                            return (
                              <img
                                src={`data:${memberCardData.contentType || 'image/png'};base64,${base64Data}`}
                                alt="UHC Member Card"
                                className="max-w-full h-auto border border-gray-200 rounded-lg shadow-lg mx-auto"
                                onError={(e) => {
                                  console.error('Image loading failed:', e);
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            );
                          } catch (error) {
                            console.error('Image conversion failed:', error);
                            return (
                              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                <p className="text-red-700">Failed to display member card image</p>
                                <p className="text-red-600 text-sm">Error: {error instanceof Error ? error.message : 'Unknown error'}</p>
                              </div>
                            );
                          }
                        })()}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex justify-center space-x-4 mt-6">
                        <button
                          onClick={downloadMemberCard}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Download Card
                        </button>
                        
                        <button
                          onClick={() => {
                            const policy = eligibility?.memberPolicies?.[0];
                            const imageSize = memberCardData.imageData?.length || 0;
                            const contentType = memberCardData.contentType || 'Unknown';
                            const memberId = policy?.insuranceInfo?.memberId || 'Unknown';
                            
                            alert(`Image Details:\n• Size: ${imageSize.toLocaleString()} bytes\n• Content Type: ${contentType}\n• Member ID: ${memberId}`);
                          }}
                          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                          <Info className="w-4 h-4 mr-2" />
                          Image Info
                        </button>
                      </div>
                    </div>
                  )}

                  {/* JSON Data fallback */}
                  {!memberCardData.imageData && memberCardData.message && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <p className="text-gray-700 mb-2">Member card response (text format):</p>
                      <pre className="text-sm text-gray-600 overflow-x-auto whitespace-pre-wrap">
                        {memberCardData.message}
                      </pre>
                    </div>
                  )}

                  {/* Debug Information */}
                  <details className="border border-gray-200 rounded-lg">
                    <summary className="p-4 cursor-pointer text-sm font-medium text-gray-700 hover:bg-gray-50">
                      🔍 Debug Information
                    </summary>
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                      <div className="space-y-2 text-sm">
                        <p><strong>Content Type:</strong> {memberCardData.contentType || 'Not specified'}</p>
                        <p><strong>Data Size:</strong> {memberCardData.imageData?.length || 0} bytes</p>
                        {memberCardData.imageData && (
                          <p><strong>First 20 bytes (hex):</strong> {
                            memberCardData.imageData.slice(0, 20).map((b: number) => b.toString(16).padStart(2, '0')).join(' ')
                          }</p>
                        )}
                        <p><strong>Has Image Data:</strong> {memberCardData.imageData ? 'Yes' : 'No'}</p>
                        <p><strong>Has Message:</strong> {memberCardData.message ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6">
              <div className="flex justify-end">
                <button
                  onClick={closeMemberCardModal}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};