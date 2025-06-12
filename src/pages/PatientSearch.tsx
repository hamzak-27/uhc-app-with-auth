import React, { useState } from 'react';
import { TokenManager } from '../components/TokenManager';
import { PatientSearchForm } from '../components/PatientSearchForm';
import { PatientResults } from '../components/PatientResults';

export const PatientSearch: React.FC = () => {
  const [searchResults, setSearchResults] = useState<any>(null);

  const handleSearchComplete = (results: any) => {
    setSearchResults(results);
    // Scroll to results
    setTimeout(() => {
      const resultsElement = document.getElementById('search-results');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-grotesk text-neutral-900">Patient Search</h1>
        <p className="text-neutral-600 mt-2">Search for patient eligibility and insurance information</p>
      </div>

      <TokenManager />

      <PatientSearchForm onSearchComplete={handleSearchComplete} />

      {searchResults && (
        <div id="search-results\" className="slide-in">
          <PatientResults results={searchResults} />
        </div>
      )}
    </div>
  );
};