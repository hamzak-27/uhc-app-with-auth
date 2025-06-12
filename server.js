import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// UHC API Configuration from environment variables
const UHC_OAUTH_URL = process.env.UHC_OAUTH_URL || "https://apimarketplace.uhc.com/v1/oauthtoken";
const UHC_API_BASE_URL = process.env.UHC_API_BASE_URL || "https://apimarketplace.uhc.com/Eligibility";

// UHC Credentials from environment variables
const UHC_CREDENTIALS = {
  clientId: process.env.UHC_CLIENT_ID,
  clientSecret: process.env.UHC_CLIENT_SECRET
};

// Validate required environment variables
if (!UHC_CREDENTIALS.clientId || !UHC_CREDENTIALS.clientSecret) {
  console.error('❌ Missing required environment variables: UHC_CLIENT_ID and UHC_CLIENT_SECRET');
  console.error('Please create a .env file with your UHC API credentials');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'UHC API Proxy Server is running' });
});

// Token generation endpoint
app.post('/api/uhc/token', async (req, res) => {
  try {
    console.log('Token generation request received');
    
    const payload = {
      'client_id': UHC_CREDENTIALS.clientId,
      'client_secret': UHC_CREDENTIALS.clientSecret,
      'grant_type': 'client_credentials'
    };

    const response = await fetch(UHC_OAUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'env': 'production'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    
    if (response.ok) {
      const tokenData = JSON.parse(responseText);
      res.json({
        success: true,
        data: tokenData
      });
    } else {
      console.error('UHC API Error:', response.status, responseText);
      res.status(response.status).json({
        success: false,
        error: {
          status: response.status,
          message: responseText
        }
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: {
        status: 500,
        message: error.message
      }
    });
  }
});

// Eligibility search endpoint
app.post('/api/uhc/eligibility', async (req, res) => {
  try {
    const { token, ...searchParams } = req.body;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authorization token is required' }
      });
    }

    const url = `${UHC_API_BASE_URL}/api/external/member/eligibility/v3.0`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': UHC_CREDENTIALS.clientId,
        'Client-Id': UHC_CREDENTIALS.clientId,
        'env': 'production'
      },
      body: JSON.stringify(searchParams)
    });

    const responseText = await response.text();
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      res.json({
        success: true,
        data: data
      });
    } else {
      console.error('UHC Eligibility API Error:', response.status, responseText);
      res.status(response.status).json({
        success: false,
        error: {
          status: response.status,
          message: responseText
        }
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: {
        status: 500,
        message: error.message
      }
    });
  }
});

// Coverage details endpoint
app.post('/api/uhc/coverage', async (req, res) => {
  try {
    const { token, patientKey, transactionId } = req.body;
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authorization token is required' }
      });
    }

    const url = "https://apimarketplace.uhc.com/Eligibility/api/appservices/copayCoinsuranceDetails/v5.0";
    
    const payload = {
      patientKey,
      transactionId
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': UHC_CREDENTIALS.clientId,
        'Client-Id': UHC_CREDENTIALS.clientId,
        'env': 'production'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      res.json({
        success: true,
        data: data
      });
    } else {
      console.error('UHC Coverage API Error:', response.status, responseText);
      res.status(response.status).json({
        success: false,
        error: {
          status: response.status,
          message: responseText
        }
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      success: false,
      error: {
        status: 500,
        message: error.message
      }
    });
  }
});

// Member card endpoint - Fixed based on Streamlit implementation
app.post('/api/uhc/member-card', async (req, res) => {
  try {
    const { token, transactionId, memberId, dateOfBirth, payerId, firstName } = req.body;
    
    console.log('📤 Member Card API Request received:', {
      hasToken: !!token,
      transactionId,
      memberId,
      dateOfBirth,
      payerId,
      firstName
    });
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: { message: 'Authorization token is required' }
      });
    }

    // Validate required fields
    if (!transactionId || !memberId || !dateOfBirth || !payerId || !firstName) {
      const missingFields = [];
      if (!transactionId) missingFields.push('transactionId');
      if (!memberId) missingFields.push('memberId');
      if (!dateOfBirth) missingFields.push('dateOfBirth');
      if (!payerId) missingFields.push('payerId');
      if (!firstName) missingFields.push('firstName');
      
      return res.status(400).json({
        success: false,
        error: { 
          message: `Missing required fields: ${missingFields.join(', ')}`,
          missingFields
        }
      });
    }

    const url = "https://apimarketplace.uhc.com/Eligibility/api/extended/memberIdCard/image/v3.0";
    
    const payload = {
      transactionId,
      memberId,
      dateOfBirth,
      payerId,
      firstName
    };

    console.log('📤 Making UHC Member Card API call:', {
      url,
      payload
    });

    // Use headers without 'env' for member card API (as per Streamlit implementation)
    const headers = {
      'Authorization': token,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-API-Key': UHC_CREDENTIALS.clientId,
      'Client-Id': UHC_CREDENTIALS.clientId
      // Note: 'env' header removed as it causes issues with member card API
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(payload)
    });

    console.log('📥 UHC Member Card API Response:', {
      status: response.status,
      statusText: response.statusText,
      contentType: response.headers.get('content-type')
    });

    const contentType = response.headers.get('content-type') || '';
    
    if (response.ok) {
      // Check if response contains image data
      if (contentType.includes('image')) {
        console.log('✅ Received image response');
        const imageBuffer = await response.arrayBuffer();
        const imageArray = Array.from(new Uint8Array(imageBuffer));
        
        console.log('📊 Image data details:', {
          size: imageArray.length,
          contentType: contentType,
          firstBytes: imageArray.slice(0, 10)
        });
        
        res.json({
          success: true,
          data: {
            imageData: imageArray,
            contentType: contentType
          }
        });
      } else {
        // Try to parse as JSON in case it returns structured data
        const responseText = await response.text();
        console.log('📄 Received text/JSON response:', responseText.substring(0, 200));
        
        try {
          const data = JSON.parse(responseText);
          res.json({
            success: true,
            data: data
          });
        } catch (parseError) {
          console.log('⚠️ Could not parse as JSON, returning as text');
          res.json({
            success: true,
            data: { 
              message: responseText,
              contentType: contentType
            }
          });
        }
      }
    } else {
      const responseText = await response.text();
      console.error('❌ UHC Member Card API Error:', {
        status: response.status,
        statusText: response.statusText,
        responseText: responseText.substring(0, 500)
      });
      
      let errorData = {};
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText || response.statusText };
      }
      
      res.status(response.status).json({
        success: false,
        error: {
          status: response.status,
          message: errorData.message || `API error: ${response.status} ${response.statusText}`,
          details: errorData
        }
      });
    }
  } catch (error) {
    console.error('❌ Server error in member card endpoint:', error);
    res.status(500).json({
      success: false,
      error: {
        status: 500,
        message: `Server error: ${error.message}`,
        type: error.name
      }
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 UHC API Proxy Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Token endpoint: http://localhost:${PORT}/api/uhc/token`);
  console.log(`🏥 Eligibility endpoint: http://localhost:${PORT}/api/uhc/eligibility`);
  console.log(`💊 Coverage endpoint: http://localhost:${PORT}/api/uhc/coverage`);
  console.log(`🆔 Member card endpoint: http://localhost:${PORT}/api/uhc/member-card`);
});

export default app;