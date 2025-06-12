# UHC Eligibility Interface

A React-based interface for UHC (United Healthcare) eligibility verification and member information lookup.

## Features

- Patient eligibility verification
- Coverage details lookup
- Member card retrieval
- Primary care physician information
- Deductible and out-of-pocket information

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env` file in the root directory with your UHC API credentials:

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
```

**Important**: Never commit your `.env` file to version control. The actual credentials should be kept secure.

### 3. UHC API Credentials

To get your UHC API credentials:
1. Register for a developer account at [UHC API Marketplace](https://apimarketplace.uhc.com)
2. Create an application to get your `client_id` and `client_secret`
3. Add these to your `.env` file

### 4. Running the Application

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
│   └── lib/           # API utilities and services
├── server.js          # Express backend server
├── .env              # Environment variables (do not commit)
└── README.md
```

## API Endpoints

The backend server provides the following endpoints:

- `POST /api/uhc/token` - Generate OAuth token
- `POST /api/uhc/eligibility` - Check member eligibility
- `POST /api/uhc/coverage` - Get coverage details
- `POST /api/uhc/member-card` - Retrieve member card

## Security Notes

- All sensitive credentials are stored in environment variables
- The `.env` file is excluded from version control via `.gitignore`
- Never hardcode API keys or secrets in the source code
- Use environment-specific configuration for different deployment environments

## Deployment

For production deployment:

1. Set environment variables on your hosting platform
2. Build the application: `npm run build`
3. Deploy the built files and run the server

For platforms like Heroku, Vercel, or Railway, set the environment variables in their respective dashboards instead of using a `.env` file. 