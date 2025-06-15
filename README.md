# UHC Eligibility Interface

A React-based interface for UHC (United Healthcare) eligibility verification and member information lookup with Microsoft Authenticator integration.

## Features

- Patient eligibility verification
- Coverage details lookup
- Member card retrieval
- Primary care physician information
- Deductible and out-of-pocket information
- Microsoft Authenticator integration for secure authentication
- User authentication and session management

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with your credentials:

```bash
# UHC API Configuration
UHC_CLIENT_ID=your_uhc_client_id_here
UHC_CLIENT_SECRET=your_uhc_client_secret_here

# API URLs (optional - defaults to UHC production endpoints)
UHC_OAUTH_URL=https://apimarketplace.uhc.com/v1/oauthtoken
UHC_API_BASE_URL=https://apimarketplace.uhc.com/Eligibility

# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend Configuration (optional)
VITE_BACKEND_URL=http://localhost:3001

# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Microsoft Azure Configuration
VITE_AZURE_CLIENT_ID=your_azure_client_id
VITE_AZURE_TENANT_ID=your_azure_tenant_id
```

**Important**: Never commit your `.env` file to version control. The actual credentials should be kept secure.

### 3. UHC API Credentials

To get your UHC API credentials:
1. Register for a developer account at [UHC API Marketplace](https://apimarketplace.uhc.com)
2. Create an application to get your `client_id` and `client_secret`
3. Add these to your `.env` file

### 4. Microsoft Azure Configuration

To set up Microsoft Authenticator:
1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to Azure Active Directory > App registrations
3. Create a new registration or use existing one
4. Get your `Application (client) ID` and `Directory (tenant) ID`
5. Configure redirect URIs to include your application URL + `/auth/callback`
6. Add these credentials to your `.env` file

### 5. Supabase Configuration

1. Create a project at [Supabase](https://supabase.com)
2. Get your project URL and anon key from the project settings
3. Run the provided migrations to set up the database schema
4. Add the credentials to your `.env` file

### 6. Running the Application

#### Development Mode (Full Stack)
```bash
npm run dev:full
```
This starts both the backend server (port 3001) and frontend dev server (port 5173).

#### Backend Only
```bash
npm run server
```

#### Frontend Only
```bash
npm run dev
```

#### Production Build
```bash
npm run build
npm run preview
```

## Project Structure

```
├── src/
│   ├── components/     # React components
│   ├── pages/         # Page components
│   ├── lib/           # API utilities and services
│   │   ├── auth.ts    # Authentication service
│   │   ├── msal-config.ts # Microsoft MSAL configuration
│   │   └── supabase.ts # Supabase client
├── supabase/
│   ├── functions/     # Edge functions
│   └── migrations/    # Database migrations
├── server.js          # Express backend server
├── .env              # Environment variables (do not commit)
└── README.md
```

## Authentication

The application supports two authentication methods:

### 1. Email/Password Authentication
- Traditional email and password sign-up/sign-in
- Password reset functionality
- Secure session management

### 2. Microsoft Authenticator
- Enterprise-grade security
- Multi-factor authentication
- Seamless integration with organizational identity systems
- Uses Microsoft Authentication Library (MSAL)

## API Endpoints

The backend server provides the following endpoints:

- `POST /api/uhc/token` - Generate OAuth token
- `POST /api/uhc/eligibility` - Check member eligibility
- `POST /api/uhc/coverage` - Get coverage details
- `POST /api/uhc/member-card` - Retrieve member card

## Database Schema

The application uses Supabase (PostgreSQL) with the following main table:

- `patient_searches` - Stores patient search history and results
  - Includes eligibility data, coverage details, and member card information
  - Row-level security enabled for data protection
  - Indexed for optimal search performance

## Security Features

- **Row-Level Security (RLS)**: Database-level security for patient data
- **Environment Variables**: All sensitive credentials stored securely
- **HTTPS**: All API communications encrypted
- **Microsoft Authentication**: Enterprise-grade identity management
- **Session Management**: Secure user session handling
- **Token Management**: Automatic OAuth token refresh

## Microsoft Authenticator Integration

The application integrates with Microsoft Authenticator to provide:

1. **Secure Authentication**: Users can sign in using their Microsoft credentials
2. **Multi-Factor Authentication**: Leverages Microsoft's MFA capabilities
3. **Enterprise Integration**: Works with organizational Azure AD
4. **Seamless Experience**: Single sign-on with Microsoft ecosystem

### How It Works

1. User clicks "Continue with Microsoft Authenticator"
2. Application redirects to Microsoft login
3. User authenticates using Microsoft credentials (including MFA if enabled)
4. Microsoft sends authentication code to user's Authenticator app
5. User approves the sign-in request
6. Application receives authentication token and creates user session

## Security Notes

- All sensitive credentials are stored in environment variables
- The `.env` file is excluded from version control via `.gitignore`
- Never hardcode API keys or secrets in the source code
- Use environment-specific configuration for different deployment environments
- Microsoft authentication provides additional security layers including conditional access

## Deployment

For production deployment:

1. Set environment variables on your hosting platform
2. Configure Microsoft Azure app registration for production URLs
3. Set up Supabase project for production
4. Build the application: `npm run build`
5. Deploy the built files and run the server

For platforms like Heroku, Vercel, or Railway, set the environment variables in their respective dashboards instead of using a `.env` file.

## Troubleshooting

### Microsoft Authentication Issues

1. **Redirect URI Mismatch**: Ensure your Azure app registration includes the correct redirect URI
2. **Tenant Configuration**: Verify the tenant ID is correct for your organization
3. **Permissions**: Check that the app has the required permissions (User.Read, profile, email, openid)

### UHC API Issues

1. **Token Expiration**: Tokens automatically refresh, but check network connectivity
2. **Credentials**: Verify UHC API credentials are correctly set in environment variables
3. **Rate Limiting**: UHC API may have rate limits, implement appropriate retry logic

### Database Issues

1. **Connection**: Verify Supabase URL and keys are correct
2. **Migrations**: Ensure database migrations have been run
3. **RLS Policies**: Check that row-level security policies are properly configured