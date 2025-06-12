const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 
  (import.meta.env.DEV ? "http://localhost:3001" : "");
const API_ENDPOINTS = {
  token: `${BACKEND_URL}/api/uhc/token`,
  eligibility: `${BACKEND_URL}/api/uhc/eligibility`,
  coverage: `${BACKEND_URL}/api/uhc/coverage`,
  memberCard: `${BACKEND_URL}/api/uhc/member-card`
};

// API Types
export interface TokenResponse {
  success: boolean;
  token?: string;
  expires_at?: Date;
  error?: string;
}

export interface EligibilitySearchParams {
  memberId: string;
  dateOfBirth: string;
  firstName?: string;
  lastName?: string;
  payerId?: string;
  providerLastName?: string;
  taxIdNumber?: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    status?: number;
  };
}

class UHCApiClient {
  private token: string | null = null;
  private tokenExpires: Date | null = null;

  constructor() {
    // Try to load stored token on initialization
    this.loadStoredToken();
  }

  async generateToken(): Promise<TokenResponse> {
    try {
      console.log('🔄 Attempting to generate token from backend server:', API_ENDPOINTS.token);

      const response = await fetch(API_ENDPOINTS.token, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📥 Token response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        
        if (result.success) {
          const tokenData = result.data;
          console.log('✅ Token response received:', { 
            hasAccessToken: !!tokenData.access_token,
            expiresIn: tokenData.expires_in 
          });
          
          const accessToken = tokenData.access_token;
          const expiresIn = parseInt(tokenData.expires_in || '3600'); // Default to 60 minutes
          
          this.token = `Bearer ${accessToken}`;
          this.tokenExpires = new Date(Date.now() + (expiresIn * 1000));
          
          // Store in localStorage for persistence
          localStorage.setItem('uhc_token', this.token);
          localStorage.setItem('uhc_token_expires', this.tokenExpires.toISOString());
          
          return {
            success: true,
            token: this.token,
            expires_at: this.tokenExpires
          };
        } else {
          console.error('❌ Backend reported error:', result.error);
          return {
            success: false,
            error: `Backend error: ${result.error.message || 'Unknown error'}`
          };
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        console.error('❌ Token generation failed:', response.status, errorData);
        
        return {
          success: false,
          error: `Token generation failed: ${response.status} - ${errorData.error?.message || 'Unknown error'}`
        };
      }
    } catch (error) {
      console.error('❌ Network error during token generation:', error);
      
      let errorMessage = 'Unknown error';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Failed to connect to backend server. Make sure the backend server is running on port 3001.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: `Network error: ${errorMessage}`
      };
    }
  }

  loadStoredToken(): boolean {
    try {
      const storedToken = localStorage.getItem('uhc_token');
      const storedExpires = localStorage.getItem('uhc_token_expires');
      
      if (storedToken && storedExpires) {
        const expiresDate = new Date(storedExpires);
        
        // Check if token is still valid (with 5 minute buffer)
        if (new Date(Date.now() + 5 * 60 * 1000) < expiresDate) {
          this.token = storedToken;
          this.tokenExpires = expiresDate;
          console.log('✅ Token loaded from localStorage');
          return true;
        } else {
          // Token expired, clear storage
          console.log('⚠️ Stored token expired, clearing');
          this.clearStoredToken();
        }
      }
    } catch (error) {
      console.warn('⚠️ Error loading stored token:', error);
    }
    
    return false;
  }

  clearStoredToken(): void {
    localStorage.removeItem('uhc_token');
    localStorage.removeItem('uhc_token_expires');
    this.token = null;
    this.tokenExpires = null;
  }

  private async ensureValidToken(): Promise<boolean> {
    // First try to load from storage
    if (!this.token && !this.loadStoredToken()) {
      console.log('🔄 No valid token found, generating new one');
      const tokenResult = await this.generateToken();
      return tokenResult.success;
    }
    
    // Check if current token is still valid
    if (!this.token || !this.tokenExpires || new Date(Date.now() + 5 * 60 * 1000) >= this.tokenExpires) {
      console.log('🔄 Token expired or about to expire, generating new one');
      const tokenResult = await this.generateToken();
      return tokenResult.success;
    }
    
    console.log('✅ Using existing valid token');
    return true;
  }

  getTokenInfo(): { token: string | null; expires: Date | null; isValid: boolean } {
    const isValid = this.token && this.tokenExpires && new Date() < this.tokenExpires;
    console.log('🔍 Token info check:', {
      hasToken: !!this.token,
      hasExpires: !!this.tokenExpires,
      expires: this.tokenExpires,
      isValid: !!isValid,
      currentTime: new Date()
    });
    return {
      token: this.token,
      expires: this.tokenExpires,
      isValid: !!isValid
    };
  }

  async searchEligibility(params: EligibilitySearchParams): Promise<APIResponse<any>> {
    try {
      const isTokenValid = await this.ensureValidToken();
      if (!isTokenValid) {
        return { success: false, error: { message: "Failed to obtain valid token" } };
      }

      const payload = {
        token: this.token,
        memberId: params.memberId,
        dateOfBirth: params.dateOfBirth,
        searchOption: "memberIDDateOfBirth",
        payerID: params.payerId || "",
        providerLastName: params.providerLastName || "",
        taxIdNumber: params.taxIdNumber || "",
        firstName: params.firstName || "",
        lastName: params.lastName || ""
      };

      const response = await fetch(API_ENDPOINTS.eligibility, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return { success: true, data: result.data };
        } else {
          return {
            success: false,
            error: {
              message: result.error?.message || "Eligibility search failed",
              status: result.error?.status
            }
          };
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        return {
          success: false,
          error: {
            message: errorData.error?.message || `API error: ${response.status}`,
            status: response.status
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

  async getCoverageDetails(patientKey: string, transactionId: string): Promise<APIResponse<any>> {
    try {
      const isTokenValid = await this.ensureValidToken();
      if (!isTokenValid) {
        return { success: false, error: { message: "Failed to obtain valid token" } };
      }

      const payload = {
        token: this.token,
        patientKey,
        transactionId
      };

      const response = await fetch(API_ENDPOINTS.coverage, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          return { success: true, data: result.data };
        } else {
          return {
            success: false,
            error: {
              message: result.error?.message || "Coverage details search failed",
              status: result.error?.status
            }
          };
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        return {
          success: false,
          error: {
            message: errorData.error?.message || `API error: ${response.status}`,
            status: response.status
          }
        };
      }
    } catch (error) {
      return {
        success: false,
        error: {
          message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

  async getMemberCard(transactionId: string, memberId: string, dateOfBirth: string, payerId: string, firstName: string): Promise<APIResponse<any>> {
    try {
      console.log('🆔 Starting member card request...');
      
      const isTokenValid = await this.ensureValidToken();
      if (!isTokenValid) {
        console.error('❌ Failed to obtain valid token for member card');
        return { success: false, error: { message: "Failed to obtain valid token" } };
      }

      console.log('✅ Token validated, making member card API call');

      const payload = {
        token: this.token,
        transactionId,
        memberId,
        dateOfBirth,
        payerId,
        firstName
      };

      console.log('📤 Member card request payload:', {
        hasToken: !!payload.token,
        transactionId: payload.transactionId,
        memberId: payload.memberId,
        dateOfBirth: payload.dateOfBirth,
        payerId: payload.payerId,
        firstName: payload.firstName
      });

      const response = await fetch(API_ENDPOINTS.memberCard, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log('📥 Member card response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('📄 Member card response received:', {
          success: result.success,
          hasData: !!result.data,
          hasImageData: !!result.data?.imageData,
          imageDataLength: result.data?.imageData?.length || 0,
          contentType: result.data?.contentType
        });
        
        if (result.success) {
          return { success: true, data: result.data };
        } else {
          console.error('❌ Backend reported member card error:', result.error);
          return {
            success: false,
            error: {
              message: result.error?.message || "Member card retrieval failed",
              status: result.error?.status
            }
          };
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        console.error('❌ Member card API error:', {
          status: response.status,
          error: errorData
        });
        
        return {
          success: false,
          error: {
            message: errorData.error?.message || `API error: ${response.status}`,
            status: response.status
          }
        };
      }
    } catch (error) {
      console.error('❌ Network error in member card request:', error);
      return {
        success: false,
        error: {
          message: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }
}

// Export a singleton instance
export const uhcApi = new UHCApiClient();