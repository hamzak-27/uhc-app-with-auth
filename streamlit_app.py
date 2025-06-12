import streamlit as st
import requests
import json
import time
from datetime import datetime, timedelta
import base64
import os

# Import configuration
try:
    from config import UHC_API_BASE_URL, UHC_CLIENT_ID, UHC_CLIENT_SECRET, UHC_OAUTH_URL, TOKEN_FILE
except ImportError:
    # Fallback for deployment - use environment variables or Streamlit secrets
    UHC_API_BASE_URL = "https://apimarketplace.uhc.com/Eligibility"
    UHC_OAUTH_URL = "https://apimarketplace.uhc.com/v1/oauthtoken"
    TOKEN_FILE = "uhc_oauth_token.json"
    
    # Try Streamlit secrets first, then environment variables
    try:
        UHC_CLIENT_ID = st.secrets["UHC_CLIENT_ID"]
        UHC_CLIENT_SECRET = st.secrets["UHC_CLIENT_SECRET"]
    except (KeyError, FileNotFoundError):
        UHC_CLIENT_ID = os.getenv("UHC_CLIENT_ID")
        UHC_CLIENT_SECRET = os.getenv("UHC_CLIENT_SECRET")
    
    if not UHC_CLIENT_ID or not UHC_CLIENT_SECRET:
        st.error("❌ UHC API credentials not found. Please set UHC_CLIENT_ID and UHC_CLIENT_SECRET in Streamlit secrets or environment variables.")
        st.info("For Streamlit Cloud: Add credentials in the 'Secrets' section of your app settings.")
        st.info("For local development: Create a config.py file based on config_example.py")
        st.stop()

def save_token_to_file(token, expires_at):
    """Save OAuth token to local file for persistence"""
    try:
        token_data = {
            'oauth_token': token,
            'expires_at': expires_at.isoformat() if expires_at else None,
            'saved_at': datetime.now().isoformat()
        }
        with open(TOKEN_FILE, 'w') as f:
            json.dump(token_data, f)
    except Exception as e:
        st.warning(f"Could not save token to file: {str(e)}")

def load_token_from_file():
    """Load OAuth token from local file"""
    try:
        if os.path.exists(TOKEN_FILE):
            with open(TOKEN_FILE, 'r') as f:
                token_data = json.load(f)
            
            oauth_token = token_data.get('oauth_token')
            expires_at_str = token_data.get('expires_at')
            
            if oauth_token and expires_at_str:
                expires_at = datetime.fromisoformat(expires_at_str)
                
                # Check if token is still valid (with 5 minute buffer)
                if datetime.now() + timedelta(minutes=5) < expires_at:
                    return oauth_token, expires_at
                else:
                    # Token expired, remove the file
                    os.remove(TOKEN_FILE)
                    return None, None
            
    except Exception as e:
        st.warning(f"Could not load token from file: {str(e)}")
    
    return None, None

def delete_token_file():
    """Delete the token file"""
    try:
        if os.path.exists(TOKEN_FILE):
            os.remove(TOKEN_FILE)
    except Exception as e:
        st.warning(f"Could not delete token file: {str(e)}")

# Initialize session state for token management
# Try to load existing token first
if 'oauth_token' not in st.session_state:
    saved_token, saved_expires = load_token_from_file()
    st.session_state.oauth_token = saved_token
    st.session_state.token_expires_at = saved_expires
    st.session_state.token_generated = saved_token is not None

if 'token_expires_at' not in st.session_state:
    st.session_state.token_expires_at = None
if 'token_generated' not in st.session_state:
    st.session_state.token_generated = False

def generate_oauth_token():
    """Generate OAuth token using client credentials - matches Postman implementation"""
    try:
        # Use the exact format that works in Postman
        url = "https://apimarketplace.uhc.com/v1/oauthtoken"
        
        # Headers as specified in Postman
        headers = {
            'Content-Type': 'application/json',
            'env': 'production'  # Changed from 'sandbox' to 'production'
        }
        
        # Body as JSON with client credentials
        payload = {
            'client_id': UHC_CLIENT_ID,
            'client_secret': UHC_CLIENT_SECRET,
            'grant_type': 'client_credentials'
        }
        
        # Make the request
        response = requests.post(url, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get('access_token')
            expires_in = int(token_data.get('expires_in', 3599))
            
            # Store token and expiration time in session state
            st.session_state.oauth_token = f"Bearer {access_token}"
            st.session_state.token_expires_at = datetime.now() + timedelta(seconds=expires_in)
            st.session_state.token_generated = True
            
            # Save token to file for persistence
            save_token_to_file(st.session_state.oauth_token, st.session_state.token_expires_at)
            
            return {
                'success': True,
                'token': st.session_state.oauth_token,
                'expires_at': st.session_state.token_expires_at,
                'data': token_data,
                'method': 'Postman-style JSON request'
            }
        else:
            return {
                'success': False,
                'error': f"Failed to generate token. Status: {response.status_code}, Response: {response.text}",
                'status_code': response.status_code
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': f"Error generating token: {str(e)}",
            'status_code': 500
        }

def is_token_valid():
    """Check if the current token is still valid"""
    if not st.session_state.oauth_token or not st.session_state.token_expires_at:
        return False
    
    # Check if token expires in the next 5 minutes (buffer time)
    buffer_time = timedelta(minutes=5)
    return datetime.now() + buffer_time < st.session_state.token_expires_at

def get_api_headers():
    """Get headers for API requests"""
    return {
        'Authorization': st.session_state.oauth_token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': UHC_CLIENT_ID,
        'Client-Id': UHC_CLIENT_ID,
        'env': 'production'  # Changed from 'sandbox' to 'production'
    }

def get_member_card_headers():
    """Get headers specifically for member card API requests"""
    # Try without env header first, as it might not be needed for this endpoint
    return {
        'Authorization': st.session_state.oauth_token,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': UHC_CLIENT_ID,
        'Client-Id': UHC_CLIENT_ID
        # Removed 'env' header as it's causing issues with member card API
    }

def search_member_eligibility(member_id, date_of_birth, search_option='memberIDDateOfBirth', 
                            service_start=None, service_end=None, first_name=None, last_name=None,
                            payer_id=None, provider_last_name=None, tax_id_number=None):
    """Search for member eligibility information"""
    
    url = f"{UHC_API_BASE_URL}/api/external/member/eligibility/v3.0"
    
    payload = {
        "memberId": member_id,
        "dateOfBirth": date_of_birth,
        "searchOption": search_option,
        "payerID": payer_id or "",
        "providerLastName": provider_last_name or "",
        "taxIdNumber": tax_id_number or "",
        "firstName": first_name or "",
        "lastName": last_name or ""
    }
    
    if service_start:
        payload["serviceStart"] = service_start
    if service_end:
        payload["serviceEnd"] = service_end
    
    try:
        headers = get_api_headers()
        
        # Debug information
        st.write("📤 **Eligibility API Request Details:**")
        st.write(f"URL: {url}")
        st.write("Headers:")
        st.json({k: v if k != 'Authorization' else f"{v[:20]}..." for k, v in headers.items()})
        st.write("Payload:")
        st.json(payload)
        
        # Add timestamp to show when request was made
        st.write(f"🕐 **Request Time:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=30)
        
        st.write(f"📥 **Response Status:** {response.status_code}")
        
        if response.status_code == 200:
            response_data = response.json()
            
            # Debug: Show response hash to detect if responses are identical
            response_hash = hash(str(response_data))
            st.write(f"🔍 **Response Hash:** {response_hash} (use this to check if responses are identical)")
            
            return {
                'success': True,
                'data': response_data,
                'status_code': response.status_code
            }
        else:
            error_data = {}
            try:
                error_data = response.json()
            except:
                error_data = {'message': response.text}
            
            # Show error response for debugging
            st.write("📥 **Error Response:**")
            st.json(error_data)
            st.write("📥 **Raw Response Text:**")
            st.code(response.text)
            
            return {
                'success': False,
                'error': error_data,
                'status_code': response.status_code
            }
            
    except requests.exceptions.Timeout:
        return {
            'success': False,
            'error': {'message': 'Request timed out. Please try again.'},
            'status_code': 408
        }
    except Exception as e:
        return {
            'success': False,
            'error': {'message': f'Unexpected error: {str(e)}'},
            'status_code': 500
        }

def check_network_status(member_id, date_of_birth, provider_last_name, 
                       first_date_of_service, last_date_of_service, 
                       transaction_id=None, provider_first_name=None, 
                       provider_tin=None, provider_npi=None, first_name=None):
    """Check provider network status"""
    
    url = f"{UHC_API_BASE_URL}/api/external/networkStatus/v4.0"
    
    payload = {
        "memberId": member_id,
        "dateOfBirth": date_of_birth,
        "providerLastName": provider_last_name,
        "firstDateOfService": first_date_of_service,
        "lastDateOfService": last_date_of_service,
        "familyIndicator": "N",
        "payerID": "",
        "taxIdNumber": "",
        "firstName": "",
        "lastName": ""
    }
    
    if transaction_id:
        payload["transactionId"] = transaction_id
    if provider_first_name:
        payload["providerFirstName"] = provider_first_name
    if provider_tin:
        payload["providerTin"] = provider_tin
    if provider_npi:
        payload["providerNpi"] = provider_npi
    if first_name:
        payload["firstName"] = first_name
    
    if not transaction_id:
        payload["providerMpin"] = ""
    
    try:
        headers = get_api_headers()
        response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=30)
        
        if response.status_code == 200:
            return {
                'success': True,
                'data': response.json(),
                'status_code': response.status_code
            }
        else:
            error_data = {}
            try:
                error_data = response.json()
                if isinstance(error_data, list) and len(error_data) > 0:
                    error_data = error_data[0]
            except:
                error_data = {'message': response.text}
            
            return {
                'success': False,
                'error': error_data,
                'status_code': response.status_code
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': {'message': f'Unexpected error: {str(e)}'},
            'status_code': 500
        }

def get_copay_coinsurance_details(patient_key, transaction_id):
    """Get copay and coinsurance details"""
    
    url = f"{UHC_API_BASE_URL}/api/external/member/copay/v2.0"
    
    payload = {
        "patientKey": patient_key,
        "transactionId": transaction_id
    }
    
    try:
        headers = get_api_headers()
        response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=30)
        
        if response.status_code == 200:
            return {
                'success': True,
                'data': response.json(),
                'status_code': response.status_code
            }
        else:
            error_data = {}
            try:
                error_data = response.json()
            except:
                error_data = {'message': response.text}
            
            return {
                'success': False,
                'error': error_data,
                'status_code': response.status_code
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': {'message': f'Unexpected error: {str(e)}'},
            'status_code': 500
        }

def get_enhanced_copay_coinsurance_details(patient_key, transaction_id):
    """Get enhanced copay and coinsurance details using the v5.0 endpoint"""
    
    url = "https://apimarketplace.uhc.com/Eligibility/api/appservices/copayCoinsuranceDetails/v5.0"
    
    payload = {
        "patientKey": patient_key,
        "transactionId": transaction_id
    }
    
    try:
        headers = get_api_headers()
        
        # Debug information
        st.write("📤 **Enhanced Coverage API Request Details:**")
        st.write(f"URL: {url}")
        st.write("Headers:")
        st.json({k: v if k != 'Authorization' else f"{v[:20]}..." for k, v in headers.items()})
        st.write("Payload:")
        st.json(payload)
        
        response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=30)
        
        st.write(f"📥 **Coverage Response Status:** {response.status_code}")
        
        if response.status_code == 200:
            return {
                'success': True,
                'data': response.json(),
                'status_code': response.status_code
            }
        else:
            error_data = {}
            try:
                error_data = response.json()
            except:
                error_data = {'message': response.text}
            
            # Show error response for debugging
            st.write("📥 **Coverage Error Response:**")
            st.json(error_data)
            
            return {
                'success': False,
                'error': error_data,
                'status_code': response.status_code
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': {'message': f'Unexpected error: {str(e)}'},
            'status_code': 500
        }

def get_member_card_image(transaction_id, member_id, date_of_birth, payer_id, first_name):
    """Get member card image from UHC API"""
    
    url = "https://apimarketplace.uhc.com/Eligibility/api/extended/memberIdCard/image/v3.0"
    
    payload = {
        "transactionId": transaction_id,
        "memberId": member_id,
        "dateOfBirth": date_of_birth,
        "payerId": payer_id,
        "firstName": first_name
    }
    
    try:
        headers = get_member_card_headers()
        
        # Debug information
        st.write("📤 **Member Card API Request Details:**")
        st.write(f"URL: {url}")
        st.write("Headers:")
        st.json({k: v if k != 'Authorization' else f"{v[:20]}..." for k, v in headers.items()})
        st.write("Payload:")
        st.json(payload)
        
        response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=30)
        
        st.write(f"📥 **Member Card Response Status:** {response.status_code}")
        
        if response.status_code == 200:
            # Check if response contains image data
            content_type = response.headers.get('content-type', '')
            if 'image' in content_type.lower():
                return {
                    'success': True,
                    'image_data': response.content,
                    'content_type': content_type,
                    'status_code': response.status_code
                }
            else:
                # Try to parse as JSON in case it returns structured data
                try:
                    json_data = response.json()
                    return {
                        'success': True,
                        'data': json_data,
                        'status_code': response.status_code
                    }
                except:
                    return {
                        'success': True,
                        'image_data': response.content,
                        'content_type': content_type or 'application/octet-stream',
                        'status_code': response.status_code
                    }
        else:
            error_data = {}
            try:
                error_data = response.json()
            except:
                error_data = {'message': response.text}
            
            # Show error response for debugging
            st.write("📥 **Member Card Error Response:**")
            st.json(error_data)
            
            return {
                'success': False,
                'error': error_data,
                'status_code': response.status_code
            }
            
    except Exception as e:
        return {
            'success': False,
            'error': {'message': f'Unexpected error: {str(e)}'},
            'status_code': 500
        }

def format_date_to_us(date_string):
    """Convert date string to MM/DD/YYYY format"""
    if not date_string or date_string == 'N/A':
        return 'N/A'
    
    try:
        # Try different date formats that might be returned by the API
        formats_to_try = [
            '%Y-%m-%d',      # YYYY-MM-DD
            '%m/%d/%Y',      # MM/DD/YYYY (already correct)
            '%d/%m/%Y',      # DD/MM/YYYY
            '%Y%m%d',        # YYYYMMDD
            '%m-%d-%Y',      # MM-DD-YYYY
            '%d-%m-%Y',      # DD-MM-YYYY
        ]
        
        for fmt in formats_to_try:
            try:
                date_obj = datetime.strptime(date_string, fmt)
                return date_obj.strftime('%m/%d/%Y')
            except ValueError:
                continue
        
        # If no format works, return the original string
        return date_string
        
    except Exception:
        return date_string

def display_formatted_eligibility_results(data):
    """Display eligibility results in a formatted, user-friendly way"""
    
    st.subheader("📋 Eligibility Search Results")
    
    # Basic member information
    st.markdown("### 👤 Member Information")
    col1, col2, col3 = st.columns(3)
    
    with col1:
        member_id = data.get('memberId', 'N/A')
        st.metric("Member ID", member_id)
    
    with col2:
        search_status = data.get('searchStatus', 'N/A')
        st.metric("Search Status", search_status)
    
    with col3:
        transaction_id = data.get('transactionId', 'N/A')
        st.metric("Transaction ID", transaction_id)
    
    # Process member policies
    if 'memberPolicies' in data and len(data['memberPolicies']) > 0:
        for idx, policy in enumerate(data['memberPolicies']):
            st.markdown(f"### 🏥 Policy {idx + 1}")
            
            # Patient Demographics
            if 'patientInfo' in policy and policy['patientInfo']:
                patient_info = policy['patientInfo'][0]
                
                st.markdown("#### 📝 Patient Demographics")
                demo_col1, demo_col2, demo_col3 = st.columns(3)
                
                with demo_col1:
                    first_name = patient_info.get('firstName', 'N/A')
                    last_name = patient_info.get('lastName', 'N/A')
                    middle_name = patient_info.get('middleName', '')
                    full_name = f"{first_name} {middle_name} {last_name}".strip()
                    st.info(f"**Name:** {full_name}")
                    
                    dob = patient_info.get('dateOfBirth', 'N/A')
                    formatted_dob = format_date_to_us(dob)
                    st.info(f"**Date of Birth:** {formatted_dob}")
                    
                    gender = patient_info.get('gender', 'N/A')
                    st.info(f"**Gender:** {gender}")
                
                with demo_col2:
                    relationship = patient_info.get('relationship', 'N/A')
                    st.info(f"**Relationship:** {relationship}")
                    
                    patient_key = patient_info.get('patientKey', 'N/A')
                    st.info(f"**Patient Key:** {patient_key}")
                    
                    subscriber_bool = patient_info.get('subscriberBoolean', 'N/A')
                    st.info(f"**Subscriber:** {'Yes' if subscriber_bool else 'No'}")
                
                with demo_col3:
                    address1 = patient_info.get('addressLine1', 'N/A')
                    address2 = patient_info.get('addressLine2', '')
                    city = patient_info.get('city', 'N/A')
                    state = patient_info.get('state', 'N/A')
                    zip_code = patient_info.get('zip', 'N/A')
                    
                    address = f"{address1}"
                    if address2:
                        address += f", {address2}"
                    address += f", {city}, {state} {zip_code}"
                    st.info(f"**Address:** {address}")
            
            # Insurance Information
            if 'insuranceInfo' in policy:
                insurance_info = policy['insuranceInfo']
                st.markdown("#### 🏥 Insurance Information")
                
                ins_col1, ins_col2, ins_col3 = st.columns(3)
                
                with ins_col1:
                    payer_name = insurance_info.get('payerName', 'N/A')
                    st.info(f"**Payer Name:** {payer_name}")
                    
                    member_id = insurance_info.get('memberId', 'N/A')
                    st.info(f"**Member ID:** {member_id}")
                    
                    group_number = insurance_info.get('groupNumber', 'N/A')
                    st.info(f"**Group Number:** {group_number}")
                
                with ins_col2:
                    insurance_type = insurance_info.get('insuranceType', 'N/A')
                    st.info(f"**Insurance Type:** {insurance_type}")
                    
                    plan_description = insurance_info.get('planDescription', 'N/A')
                    st.info(f"**Plan Description:** {plan_description}")
                    
                    payer_status = insurance_info.get('payerStatus', 'N/A')
                    st.info(f"**Payer Status:** {payer_status}")
                
                with ins_col3:
                    line_of_business = insurance_info.get('lineOfBusiness', 'N/A')
                    st.info(f"**Line of Business:** {line_of_business}")
                    
                    payer_id = insurance_info.get('payerId', 'N/A')
                    st.info(f"**Payer ID:** {payer_id}")
                    
                    platform = insurance_info.get('platform', 'N/A')
                    st.info(f"**Platform:** {platform}")
            
            # Policy Information
            if 'policyInfo' in policy:
                policy_info = policy['policyInfo']
                st.markdown("#### 📋 Policy Information")
                
                pol_col1, pol_col2, pol_col3 = st.columns(3)
                
                with pol_col1:
                    policy_status = policy_info.get('policyStatus', 'N/A')
                    st.info(f"**Policy Status:** {policy_status}")
                    
                    coverage_type = policy_info.get('coverageType', 'N/A')
                    st.info(f"**Coverage Type:** {coverage_type}")
                
                with pol_col2:
                    if 'eligibilityDates' in policy_info:
                        elig_dates = policy_info['eligibilityDates']
                        start_date = format_date_to_us(elig_dates.get('startDate', 'N/A'))
                        end_date = format_date_to_us(elig_dates.get('endDate', 'N/A'))
                        st.info(f"**Eligibility Period:** {start_date} to {end_date}")
                
                with pol_col3:
                    if 'planDates' in policy_info:
                        plan_dates = policy_info['planDates']
                        plan_start = format_date_to_us(plan_dates.get('startDate', 'N/A'))
                        plan_end = format_date_to_us(plan_dates.get('endDate', 'N/A'))
                        st.info(f"**Plan Period:** {plan_start} to {plan_end}")
            
            # Plan Message
            if 'planMessage' in policy and policy['planMessage']:
                st.markdown("#### 💬 Plan Message")
                st.info(policy['planMessage'])
            
            # Referral Information
            if 'referralInfo' in policy:
                referral_info = policy['referralInfo']
                st.markdown("#### 🔄 Referral Information")
                
                ref_col1, ref_col2 = st.columns(2)
                
                with ref_col1:
                    referral_indicator = referral_info.get('referralIndicator', 'N/A')
                    referral_needed = 'Yes' if referral_indicator == 'Y' else 'No' if referral_indicator == 'N' else referral_indicator
                    st.info(f"**Referral Required:** {referral_needed}")
                
                with ref_col2:
                    rlink_ebn = referral_info.get('rLinkEBN', 'N/A')
                    st.info(f"**rLink EBN:** {'Yes' if rlink_ebn else 'No' if rlink_ebn is False else rlink_ebn}")
            
            # Primary Care Physician Information
            if 'primaryCarePhysicianInfo' in policy:
                pcp_info = policy['primaryCarePhysicianInfo']
                if pcp_info.get('pcpFound') == 'true':
                    st.markdown("#### 👨‍⚕️ Primary Care Physician")
                    
                    pcp_col1, pcp_col2 = st.columns(2)
                    
                    with pcp_col1:
                        pcp_name = f"{pcp_info.get('firstName', '')} {pcp_info.get('middleName', '')} {pcp_info.get('lastName', '')}".strip()
                        st.info(f"**PCP Name:** {pcp_name}")
                        
                        provider_group = pcp_info.get('providerGroupName', 'N/A')
                        st.info(f"**Provider Group:** {provider_group}")
                    
                    with pcp_col2:
                        pcp_address = f"{pcp_info.get('addressLine1', '')}"
                        if pcp_info.get('addressLine2'):
                            pcp_address += f", {pcp_info.get('addressLine2')}"
                        pcp_address += f", {pcp_info.get('city', '')}, {pcp_info.get('state', '')} {pcp_info.get('zip', '')}"
                        st.info(f"**Address:** {pcp_address}")
                        
                        network_status = pcp_info.get('networkStatusCode', 'N/A')
                        st.info(f"**Network Status:** {network_status}")
            
            # Additional Coverage Information
            if 'additionalCoverageInfo' in policy and policy['additionalCoverageInfo']:
                additional_coverage = policy['additionalCoverageInfo'][0]
                if additional_coverage.get('additionalCoverage') != 'None':
                    st.markdown("#### ➕ Additional Coverage Information")
                    st.info(f"**Additional Coverage:** {additional_coverage.get('additionalCoverage', 'N/A')}")
            
            # Deductible Information
            if 'deductibleInfo' in policy:
                deductible_info = policy['deductibleInfo']
                if deductible_info.get('found'):
                    st.markdown("#### 💰 Deductible Information")
                    
                    if deductible_info.get('message'):
                        st.info(f"**Message:** {deductible_info['message']}")
                    
                    # Create deductible table
                    import pandas as pd
                    deductible_data = []
                    
                    # Individual deductibles
                    individual = deductible_info.get('individual', {})
                    if individual.get('found'):
                        # In-Network
                        in_network = individual.get('inNetwork', {})
                        if in_network.get('found'):
                            deductible_data.append({
                                'Type': 'Individual In-Network',
                                'Plan Amount': f"${in_network.get('planAmount', '0')}{in_network.get('planAmountFrequency', '')}",
                                'Remaining': f"${in_network.get('remainingAmount', '0')}",
                                'Met YTD': f"${in_network.get('metYtdAmount', '0')}"
                            })
                        
                        # Out-of-Network
                        out_network = individual.get('outOfNetwork', {})
                        if out_network.get('found'):
                            deductible_data.append({
                                'Type': 'Individual Out-of-Network',
                                'Plan Amount': f"${out_network.get('planAmount', '0')}{out_network.get('planAmountFrequency', '')}",
                                'Remaining': f"${out_network.get('remainingAmount', '0')}",
                                'Met YTD': f"${out_network.get('metYtdAmount', '0')}"
                            })
                    
                    # Family deductibles
                    family = deductible_info.get('family', {})
                    if family.get('found'):
                        # In-Network
                        in_network = family.get('inNetwork', {})
                        if in_network.get('found'):
                            deductible_data.append({
                                'Type': 'Family In-Network',
                                'Plan Amount': f"${in_network.get('planAmount', '0')}{in_network.get('planAmountFrequency', '')}",
                                'Remaining': f"${in_network.get('remainingAmount', '0')}",
                                'Met YTD': f"${in_network.get('metYtdAmount', '0')}"
                            })
                        
                        # Out-of-Network
                        out_network = family.get('outOfNetwork', {})
                        if out_network.get('found'):
                            deductible_data.append({
                                'Type': 'Family Out-of-Network',
                                'Plan Amount': f"${out_network.get('planAmount', '0')}{out_network.get('planAmountFrequency', '')}",
                                'Remaining': f"${out_network.get('remainingAmount', '0')}",
                                'Met YTD': f"${out_network.get('metYtdAmount', '0')}"
                            })
                    
                    if deductible_data:
                        df_deductibles = pd.DataFrame(deductible_data)
                        st.dataframe(df_deductibles, use_container_width=True)
            
            # Out of Pocket Information
            if 'outOfPocketInfo' in policy:
                oop_info = policy['outOfPocketInfo']
                if oop_info.get('found'):
                    st.markdown("#### 🏦 Out of Pocket Information")
                    
                    if oop_info.get('message'):
                        st.info(f"**Message:** {oop_info['message']}")
                    
                    # Create out of pocket table
                    import pandas as pd
                    oop_data = []
                    
                    # Individual out of pocket
                    individual = oop_info.get('individual', {})
                    if individual.get('found'):
                        # In-Network
                        in_network = individual.get('inNetwork', {})
                        if in_network.get('found'):
                            oop_data.append({
                                'Type': 'Individual In-Network',
                                'Plan Amount': f"${in_network.get('planAmount', '0')}{in_network.get('planAmountFrequency', '')}",
                                'Remaining': f"${in_network.get('remainingAmount', '0')}",
                                'Met YTD': f"${in_network.get('metYtdAmount', '0')}"
                            })
                        
                        # Out-of-Network
                        out_network = individual.get('outOfNetwork', {})
                        if out_network.get('found'):
                            oop_data.append({
                                'Type': 'Individual Out-of-Network',
                                'Plan Amount': f"${out_network.get('planAmount', '0')}{out_network.get('planAmountFrequency', '')}",
                                'Remaining': f"${out_network.get('remainingAmount', '0')}",
                                'Met YTD': f"${out_network.get('metYtdAmount', '0')}"
                            })
                    
                    # Family out of pocket
                    family = oop_info.get('family', {})
                    if family.get('found'):
                        # In-Network
                        in_network = family.get('inNetwork', {})
                        if in_network.get('found'):
                            oop_data.append({
                                'Type': 'Family In-Network',
                                'Plan Amount': f"${in_network.get('planAmount', '0')}{in_network.get('planAmountFrequency', '')}",
                                'Remaining': f"${in_network.get('remainingAmount', '0')}",
                                'Met YTD': f"${in_network.get('metYtdAmount', '0')}"
                            })
                        
                        # Out-of-Network
                        out_network = family.get('outOfNetwork', {})
                        if out_network.get('found'):
                            oop_data.append({
                                'Type': 'Family Out-of-Network',
                                'Plan Amount': f"${out_network.get('planAmount', '0')}{out_network.get('planAmountFrequency', '')}",
                                'Remaining': f"${out_network.get('remainingAmount', '0')}",
                                'Met YTD': f"${out_network.get('metYtdAmount', '0')}"
                            })
                    
                    if oop_data:
                        df_oop = pd.DataFrame(oop_data)
                        st.dataframe(df_oop, use_container_width=True)
            
            # Copay Maximum Information
            if 'copayMaxInfo' in policy:
                copay_max_info = policy['copayMaxInfo']
                if copay_max_info.get('found'):
                    st.markdown("#### 💵 Copay Maximum Information")
                    
                    if copay_max_info.get('message'):
                        st.info(f"**Message:** {copay_max_info['message']}")
                    
                    # Create copay max table (similar structure as above)
                    import pandas as pd
                    copay_max_data = []
                    
                    # Individual copay max
                    individual = copay_max_info.get('individual', {})
                    if individual.get('found'):
                        in_network = individual.get('inNetwork', {})
                        if in_network.get('found'):
                            copay_max_data.append({
                                'Type': 'Individual In-Network',
                                'Plan Amount': f"${in_network.get('planAmount', '0')}{in_network.get('planAmountFrequency', '')}",
                                'Remaining': f"${in_network.get('remainingAmount', '0')}",
                                'Met YTD': f"${in_network.get('metYtdAmount', '0')}"
                            })
                    
                    if copay_max_data:
                        df_copay_max = pd.DataFrame(copay_max_data)
                        st.dataframe(df_copay_max, use_container_width=True)
                else:
                    if copay_max_info.get('message'):
                        st.markdown("#### 💵 Copay Maximum Information")
                        st.info(f"**Message:** {copay_max_info['message']}")
            
            # Out of Pocket Maximum Information (different from outOfPocketInfo)
            if 'outOfPocketMaxInfo' in policy:
                oop_max_info = policy['outOfPocketMaxInfo']
                if oop_max_info.get('found'):
                    st.markdown("#### 🏦 Out of Pocket Maximum Information")
                    
                    if oop_max_info.get('message'):
                        st.info(f"**Message:** {oop_max_info['message']}")
                else:
                    if oop_max_info.get('message'):
                        st.markdown("#### 🏦 Out of Pocket Maximum Information")
                        st.info(f"**Message:** {oop_max_info['message']}")
            
            # Copay Cap Information
            if policy.get('copayCapIndicator') or policy.get('copayCapMessage'):
                st.markdown("#### 🛡️ Copay Cap Information")
                
                copay_cap_col1, copay_cap_col2 = st.columns(2)
                
                with copay_cap_col1:
                    copay_cap_indicator = policy.get('copayCapIndicator', False)
                    st.info(f"**Copay Cap Applied:** {'Yes' if copay_cap_indicator else 'No'}")
                
                with copay_cap_col2:
                    if policy.get('copayCapMessage'):
                        st.info(f"**Copay Cap Message:** {policy['copayCapMessage']}")
            
            st.markdown("---")
    
    # Requesting Provider Information
    if 'requestingProvider' in data:
        requesting_provider = data['requestingProvider']
        st.markdown("### 🏥 Requesting Provider Information")
        
        req_col1, req_col2 = st.columns(2)
        
        with req_col1:
            provider_name = f"{requesting_provider.get('providerFirstName', '')} {requesting_provider.get('providerMiddleName', '')} {requesting_provider.get('providerLastName', '')}".strip()
            if not provider_name:
                provider_name = requesting_provider.get('organizationName', 'N/A')
            st.info(f"**Provider Name:** {provider_name}")
            
            organization_name = requesting_provider.get('organizationName', 'N/A')
            if organization_name and organization_name != provider_name:
                st.info(f"**Organization:** {organization_name}")
        
        with req_col2:
            npi = requesting_provider.get('npi', 'N/A')
            st.info(f"**NPI:** {npi}")
            
            tax_id = requesting_provider.get('taxIdNumber', 'N/A')
            st.info(f"**Tax ID:** {tax_id}")
    
    else:
        st.warning("⚠️ No member policies found in the response.")
    
    # Show raw JSON in expandable section
    with st.expander("🔍 View Raw JSON Response", expanded=False):
        st.json(data)

def display_member_card_popup(eligibility_data):
    """Display member card in a popup-style interface"""
    
    # Extract required information for member card API
    if 'memberPolicies' in eligibility_data and len(eligibility_data['memberPolicies']) > 0:
        first_policy = eligibility_data['memberPolicies'][0]
        patient_info = first_policy.get('patientInfo', [{}])[0] if first_policy.get('patientInfo') else {}
        insurance_info = first_policy.get('insuranceInfo', {})
        
        transaction_id = first_policy.get('transactionId')
        member_id = insurance_info.get('memberId')
        payer_id = insurance_info.get('payerId')
        first_name = patient_info.get('firstName')
        date_of_birth = patient_info.get('dateOfBirth')
        
        if all([transaction_id, member_id, payer_id, first_name, date_of_birth]):
            st.info("🔄 Fetching member card...")
            
            with st.spinner("Retrieving member card image..."):
                card_result = get_member_card_image(
                    transaction_id=transaction_id,
                    member_id=member_id,
                    date_of_birth=date_of_birth,
                    payer_id=payer_id,
                    first_name=first_name
                )
            
            if card_result['success']:
                if 'image_data' in card_result:
                    st.success("✅ Member card retrieved successfully!")
                    
                    # Display the image with multiple fallback methods
                    st.markdown("### 🆔 Member Card")
                    
                    image_displayed = False
                    
                    # Method 1: Try direct st.image display
                    try:
                        st.image(card_result['image_data'], caption="UHC Member Card", use_column_width=True)
                        image_displayed = True
                        st.info("✅ Image displayed successfully")
                    except Exception as e:
                        st.warning(f"⚠️ Direct image display failed: {str(e)}")
                    
                    # Method 2: Try base64 encoding and HTML display
                    if not image_displayed:
                        try:
                            import base64
                            
                            # Convert image to base64
                            image_base64 = base64.b64encode(card_result['image_data']).decode()
                            content_type = card_result.get('content_type', 'image/png')
                            
                            # Create HTML with base64 image
                            img_html = f"""
                            <div style="text-align: center; padding: 20px;">
                                <img src="data:{content_type};base64,{image_base64}" 
                                     style="max-width: 100%; height: auto; border: 2px solid #ddd; border-radius: 8px;" 
                                     alt="UHC Member Card" />
                            </div>
                            """
                            
                            st.markdown(img_html, unsafe_allow_html=True)
                            image_displayed = True
                            st.info("✅ Image displayed using base64 encoding")
                        except Exception as e:
                            st.warning(f"⚠️ Base64 image display failed: {str(e)}")
                    
                    # Method 3: Provide download and view options
                    st.markdown("#### 📥 Alternative Access Methods")
                    
                    col1, col2, col3 = st.columns(3)
                    
                    with col1:
                        # Download button
                        st.download_button(
                            label="📥 Download Member Card",
                            data=card_result['image_data'],
                            file_name=f"member_card_{member_id}.png",
                            mime=card_result.get('content_type', 'image/png'),
                            use_container_width=True
                        )
                    
                    with col2:
                        # Save to temporary file and provide link
                        if st.button("💾 Save & Open", use_container_width=True):
                            try:
                                import tempfile
                                import webbrowser
                                import os
                                
                                # Create temporary file
                                with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as tmp_file:
                                    tmp_file.write(card_result['image_data'])
                                    tmp_file_path = tmp_file.name
                                
                                # Try to open in default image viewer
                                if os.name == 'nt':  # Windows
                                    os.startfile(tmp_file_path)
                                elif os.name == 'posix':  # macOS and Linux
                                    os.system(f'open "{tmp_file_path}"' if os.uname().sysname == 'Darwin' 
                                            else f'xdg-open "{tmp_file_path}"')
                                
                                st.success("✅ File saved and opened in default image viewer")
                            except Exception as e:
                                st.error(f"❌ Error saving file: {str(e)}")
                    
                    with col3:
                        # Show image info
                        if st.button("ℹ️ Image Info", use_container_width=True):
                            st.write("**Image Details:**")
                            st.write(f"• Size: {len(card_result['image_data']):,} bytes")
                            st.write(f"• Content Type: {card_result.get('content_type', 'Unknown')}")
                            st.write(f"• Member ID: {member_id}")
                            
                            # Try to get image dimensions
                            try:
                                from PIL import Image
                                import io
                                img = Image.open(io.BytesIO(card_result['image_data']))
                                st.write(f"• Dimensions: {img.width} x {img.height} pixels")
                                st.write(f"• Format: {img.format}")
                            except Exception:
                                st.write("• Dimensions: Unable to determine")
                    
                    # Method 4: Raw data view for debugging
                    with st.expander("🔍 Debug Information", expanded=False):
                        st.write("**Response Headers:**")
                        st.write(f"Content-Type: {card_result.get('content_type', 'Not specified')}")
                        st.write(f"Data Size: {len(card_result['image_data'])} bytes")
                        
                        # Show first few bytes as hex
                        hex_preview = ' '.join([f'{b:02x}' for b in card_result['image_data'][:20]])
                        st.write(f"First 20 bytes (hex): {hex_preview}")
                        
                        # Check if it looks like common image formats
                        data_start = card_result['image_data'][:10]
                        if data_start.startswith(b'\x89PNG'):
                            st.write("🔍 Detected: PNG image format")
                        elif data_start.startswith(b'\xff\xd8\xff'):
                            st.write("🔍 Detected: JPEG image format")
                        elif data_start.startswith(b'GIF'):
                            st.write("🔍 Detected: GIF image format")
                        elif data_start.startswith(b'BM'):
                            st.write("🔍 Detected: BMP image format")
                        else:
                            st.write("🔍 Unknown image format or not an image")
                elif 'data' in card_result:
                    st.success("✅ Member card data retrieved successfully!")
                    st.json(card_result['data'])
                else:
                    st.warning("⚠️ Member card retrieved but format is unknown")
            else:
                st.error(f"❌ Failed to retrieve member card: {card_result['error'].get('message', 'Unknown error')}")
        else:
            missing_fields = []
            if not transaction_id: missing_fields.append("transaction_id")
            if not member_id: missing_fields.append("member_id")
            if not payer_id: missing_fields.append("payer_id")
            if not first_name: missing_fields.append("first_name")
            if not date_of_birth: missing_fields.append("date_of_birth")
            
            st.error(f"❌ Cannot retrieve member card. Missing required fields: {', '.join(missing_fields)}")
    else:
        st.error("❌ No member policies found for member card retrieval")

def display_enhanced_patient_data(eligibility_data, coverage_data=None):
    """Display enhanced patient data in the requested format"""
    
    st.markdown("---")
    st.header("📊 Enhanced Patient Data Summary")
    
    # Display Member Card directly
    st.markdown("### 🆔 Member Card")
    display_member_card_popup(eligibility_data)
    
    # Extract patient info from the first policy
    if 'memberPolicies' in eligibility_data and len(eligibility_data['memberPolicies']) > 0:
        first_policy = eligibility_data['memberPolicies'][0]
        patient_info = first_policy.get('patientInfo', [{}])[0] if first_policy.get('patientInfo') else {}
        
        # 1. PATIENT DEMOGRAPHICS
        st.subheader("👤 PATIENT DEMOGRAPHICS")
        
        demo_col1, demo_col2 = st.columns(2)
        
        with demo_col1:
            # Name
            first_name = patient_info.get('firstName', 'N/A')
            last_name = patient_info.get('lastName', 'N/A')
            middle_name = patient_info.get('middleName', '')
            full_name = f"{first_name} {middle_name} {last_name}".strip()
            st.info(f"**Full Name:** {full_name}")
            
            # Gender
            gender = patient_info.get('gender', 'N/A')
            st.info(f"**Gender:** {gender}")
            
            # DOB
            dob = patient_info.get('dateOfBirth', 'N/A')
            formatted_dob = format_date_to_us(dob)
            st.info(f"**Date of Birth:** {formatted_dob}")
        
        with demo_col2:
            # Address
            address1 = patient_info.get('addressLine1', 'N/A')
            address2 = patient_info.get('addressLine2', '')
            city = patient_info.get('city', 'N/A')
            state = patient_info.get('state', 'N/A')
            zip_code = patient_info.get('zip', 'N/A')
            
            address = f"{address1}"
            if address2:
                address += f", {address2}"
            address += f", {city}, {state} {zip_code}"
            st.info(f"**Address:** {address}")
            
            # Relationship
            relationship = patient_info.get('relationship', 'N/A')
            st.info(f"**Relationship:** {relationship}")
            
            # Subscriber status
            subscriber_bool = patient_info.get('subscriberBoolean', 'N/A')
            st.info(f"**Subscriber:** {'Yes' if subscriber_bool else 'No'}")
        
        # 2. POLICIES
        st.subheader("📋 POLICIES")
        
        for idx, policy in enumerate(eligibility_data.get('memberPolicies', [])):
            with st.expander(f"Policy {idx + 1} - {policy.get('policyInfo', {}).get('coverageType', 'N/A')}", expanded=(idx == 0)):
                
                # Insurance Information
                insurance_info = policy.get('insuranceInfo', {})
                pol_col1, pol_col2, pol_col3 = st.columns(3)
                
                with pol_col1:
                    st.write("**Insurance Details:**")
                    st.write(f"• Member ID: {insurance_info.get('memberId', 'N/A')}")
                    st.write(f"• Payer Name: {insurance_info.get('payerName', 'N/A')}")
                    st.write(f"• Plan Description: {insurance_info.get('planDescription', 'N/A')}")
                    st.write(f"• Group Number: {insurance_info.get('groupNumber', 'N/A')}")
                
                with pol_col2:
                    st.write("**Policy Details:**")
                    policy_info = policy.get('policyInfo', {})
                    st.write(f"• Policy Status: {policy_info.get('policyStatus', 'N/A')}")
                    st.write(f"• Coverage Type: {policy_info.get('coverageType', 'N/A')}")
                    
                    if 'eligibilityDates' in policy_info:
                        elig_dates = policy_info['eligibilityDates']
                        start_date = format_date_to_us(elig_dates.get('startDate', 'N/A'))
                        end_date = format_date_to_us(elig_dates.get('endDate', 'N/A'))
                        st.write(f"• Eligibility: {start_date} to {end_date}")
                
                with pol_col3:
                    st.write("**Network Details:**")
                    st.write(f"• Insurance Type: {insurance_info.get('insuranceType', 'N/A')}")
                    st.write(f"• Line of Business: {insurance_info.get('lineOfBusiness', 'N/A')}")
                    st.write(f"• Platform: {insurance_info.get('platform', 'N/A')}")
                    
                    # Referral Info
                    referral_info = policy.get('referralInfo', {})
                    referral_indicator = referral_info.get('referralIndicator', 'N/A')
                    referral_needed = 'Yes' if referral_indicator == 'Y' else 'No' if referral_indicator == 'N' else referral_indicator
                    st.write(f"• Referral Required: {referral_needed}")
        
        # 3. DEDUCTIBLES
        st.subheader("💰 DEDUCTIBLES")
        
        # Create deductible summary table
        import pandas as pd
        deductible_data = []
        
        for idx, policy in enumerate(eligibility_data.get('memberPolicies', [])):
            deductible_info = policy.get('deductibleInfo', {})
            if deductible_info.get('found'):
                policy_name = f"Policy {idx + 1}"
                
                # Individual deductibles
                individual = deductible_info.get('individual', {})
                if individual.get('found'):
                    # In-Network
                    in_network = individual.get('inNetwork', {})
                    if in_network.get('found'):
                        deductible_data.append({
                            'Policy': policy_name,
                            'Type': 'Individual In-Network',
                            'Plan Amount': f"${in_network.get('planAmount', '0')}{in_network.get('planAmountFrequency', '')}",
                            'Remaining': f"${in_network.get('remainingAmount', '0')}",
                            'Met YTD': f"${in_network.get('metYtdAmount', '0')}"
                        })
                    
                    # Out-of-Network
                    out_network = individual.get('outOfNetwork', {})
                    if out_network.get('found'):
                        deductible_data.append({
                            'Policy': policy_name,
                            'Type': 'Individual Out-of-Network',
                            'Plan Amount': f"${out_network.get('planAmount', '0')}{out_network.get('planAmountFrequency', '')}",
                            'Remaining': f"${out_network.get('remainingAmount', '0')}",
                            'Met YTD': f"${out_network.get('metYtdAmount', '0')}"
                        })
                
                # Family deductibles
                family = deductible_info.get('family', {})
                if family.get('found'):
                    # In-Network
                    in_network = family.get('inNetwork', {})
                    if in_network.get('found'):
                        deductible_data.append({
                            'Policy': policy_name,
                            'Type': 'Family In-Network',
                            'Plan Amount': f"${in_network.get('planAmount', '0')}{in_network.get('planAmountFrequency', '')}",
                            'Remaining': f"${in_network.get('remainingAmount', '0')}",
                            'Met YTD': f"${in_network.get('metYtdAmount', '0')}"
                        })
                    
                    # Out-of-Network
                    out_network = family.get('outOfNetwork', {})
                    if out_network.get('found'):
                        deductible_data.append({
                            'Policy': policy_name,
                            'Type': 'Family Out-of-Network',
                            'Plan Amount': f"${out_network.get('planAmount', '0')}{out_network.get('planAmountFrequency', '')}",
                            'Remaining': f"${out_network.get('remainingAmount', '0')}",
                            'Met YTD': f"${out_network.get('metYtdAmount', '0')}"
                        })
        
        if deductible_data:
            df_deductibles = pd.DataFrame(deductible_data)
            st.dataframe(df_deductibles, use_container_width=True)
        else:
            st.info("No deductible information found")
        
        # 4. OUT-OF-POCKET INFORMATION
        st.subheader("🏦 OUT-OF-POCKET INFORMATION")
        
        # Create out-of-pocket summary table
        oop_data = []
        
        for idx, policy in enumerate(eligibility_data.get('memberPolicies', [])):
            oop_info = policy.get('outOfPocketInfo', {})
            if oop_info.get('found'):
                policy_name = f"Policy {idx + 1}"
                
                # Individual out of pocket
                individual = oop_info.get('individual', {})
                if individual.get('found'):
                    # In-Network
                    in_network = individual.get('inNetwork', {})
                    if in_network.get('found'):
                        oop_data.append({
                            'Policy': policy_name,
                            'Type': 'Individual In-Network',
                            'Plan Amount': f"${in_network.get('planAmount', '0')}{in_network.get('planAmountFrequency', '')}",
                            'Remaining': f"${in_network.get('remainingAmount', '0')}",
                            'Met YTD': f"${in_network.get('metYtdAmount', '0')}"
                        })
                    
                    # Out-of-Network
                    out_network = individual.get('outOfNetwork', {})
                    if out_network.get('found'):
                        oop_data.append({
                            'Policy': policy_name,
                            'Type': 'Individual Out-of-Network',
                            'Plan Amount': f"${out_network.get('planAmount', '0')}{out_network.get('planAmountFrequency', '')}",
                            'Remaining': f"${out_network.get('remainingAmount', '0')}",
                            'Met YTD': f"${out_network.get('metYtdAmount', '0')}"
                        })
                
                # Family out of pocket
                family = oop_info.get('family', {})
                if family.get('found'):
                    # In-Network
                    in_network = family.get('inNetwork', {})
                    if in_network.get('found'):
                        oop_data.append({
                            'Policy': policy_name,
                            'Type': 'Family In-Network',
                            'Plan Amount': f"${in_network.get('planAmount', '0')}{in_network.get('planAmountFrequency', '')}",
                            'Remaining': f"${in_network.get('remainingAmount', '0')}",
                            'Met YTD': f"${in_network.get('metYtdAmount', '0')}"
                        })
                    
                    # Out-of-Network
                    out_network = family.get('outOfNetwork', {})
                    if out_network.get('found'):
                        oop_data.append({
                            'Policy': policy_name,
                            'Type': 'Family Out-of-Network',
                            'Plan Amount': f"${out_network.get('planAmount', '0')}{out_network.get('planAmountFrequency', '')}",
                            'Remaining': f"${out_network.get('remainingAmount', '0')}",
                            'Met YTD': f"${out_network.get('metYtdAmount', '0')}"
                        })
        
        if oop_data:
            df_oop = pd.DataFrame(oop_data)
            st.dataframe(df_oop, use_container_width=True)
        else:
            st.info("No out-of-pocket information found")
        
        # 5. COPAY AND COINSURANCE DETAILS
        if coverage_data:
            st.subheader("💵 COPAY AND COINSURANCE DETAILS")
            
            copay_details = coverage_data.get('CopayCoInsuranceDetails', {})
            individual_coverage = copay_details.get('individual', {})
            
            # In-Network Services
            in_network = individual_coverage.get('inNetwork', {})
            if in_network.get('found'):
                st.markdown("#### 🔗 In-Network Services")
                
                services_data = []
                services = in_network.get('services', [])
                
                for service in services:
                    if service.get('found'):
                        service_name = service.get('text', service.get('service', 'Unknown'))
                        status = service.get('status', 'N/A')
                        copay = f"${service.get('coPayAmount', '0')}{service.get('coPayFrequency', '')}"
                        coinsurance = f"{service.get('coInsurancePercent', '0')}%"
                        
                        # Check for deductible info
                        deductible_info = "N/A"
                        messages = service.get('messages', {})
                        if messages.get('deductibles', {}).get('found'):
                            deductible_messages = messages.get('deductibles', {}).get('message', [])
                            if deductible_messages:
                                deductible_info = "; ".join(deductible_messages)
                        
                        services_data.append({
                            'Service': service_name,
                            'Status': status,
                            'Copay': copay,
                            'Coinsurance': coinsurance,
                            'Deductible': deductible_info
                        })
                
                if services_data:
                    df_services = pd.DataFrame(services_data)
                    st.dataframe(df_services, use_container_width=True)
                    
                    # Benefits dropdown for services with benefits
                    for service in services:
                        if service.get('found'):
                            service_name = service.get('text', service.get('service', 'Unknown'))
                            messages = service.get('messages', {})
                            
                            # Check for benefits
                            benefits_allowed = messages.get('benefitsAllowed', {})
                            if benefits_allowed.get('found'):
                                with st.expander(f"📊 Benefits for {service_name}"):
                                    benefit_messages = benefits_allowed.get('message', [])
                                    for msg in benefit_messages:
                                        st.write(f"• {msg}")
                                    
                                    # Show limitation info
                                    limitation_info = benefits_allowed.get('limitationInfo', [])
                                    if limitation_info:
                                        st.write("**Limitations:**")
                                        for limit in limitation_info:
                                            period = limit.get('lmtPeriod', 'N/A')
                                            lmt_type = limit.get('lmtType', 'N/A')
                                            occur = limit.get('lmtOccurPerPeriod', 'N/A')
                                            dollar = limit.get('lmtDollarPerPeriod', 'N/A')
                                            limit_messages = limit.get('message', [])
                                            
                                            if occur and occur != '':
                                                st.write(f"• {lmt_type}: {occur} per {period}")
                                            if dollar and dollar != '':
                                                st.write(f"• Dollar Limit: ${dollar} per {period}")
                                            for lmsg in limit_messages:
                                                st.write(f"• {lmsg}")
            
            # Out-of-Network Services
            out_network = individual_coverage.get('outOfNetwork', {})
            if out_network.get('found'):
                st.markdown("#### 🔗 Out-of-Network Services")
                
                oon_services_data = []
                oon_services = out_network.get('services', [])
                
                for service in oon_services:
                    if service.get('found'):
                        service_name = service.get('text', service.get('service', 'Unknown'))
                        status = service.get('status', 'N/A')
                        copay = f"${service.get('coPayAmount', '0')}{service.get('coPayFrequency', '')}"
                        coinsurance = f"{service.get('coInsurancePercent', '0')}%"
                        
                        # Check for deductible info
                        deductible_info = "N/A"
                        messages = service.get('messages', {})
                        if messages.get('deductibles', {}).get('found'):
                            deductible_messages = messages.get('deductibles', {}).get('message', [])
                            if deductible_messages:
                                deductible_info = "; ".join(deductible_messages)
                        
                        oon_services_data.append({
                            'Service': service_name,
                            'Status': status,
                            'Copay': copay,
                            'Coinsurance': coinsurance,
                            'Deductible': deductible_info
                        })
                
                if oon_services_data:
                    df_oon_services = pd.DataFrame(oon_services_data)
                    st.dataframe(df_oon_services, use_container_width=True)
            
            # Vendor Coverage Details
            vendor_coverage = coverage_data.get('vendorCoverageDetails', {})
            if vendor_coverage.get('found'):
                st.markdown("#### 🏢 Vendor Coverage Details")
                
                vendor_services = vendor_coverage.get('vendorServices', [])
                if vendor_services:
                    vendor_col1, vendor_col2, vendor_col3 = st.columns(3)
                    
                    for idx, vendor in enumerate(vendor_services):
                        col = [vendor_col1, vendor_col2, vendor_col3][idx % 3]
                        with col:
                            st.info(f"**{vendor.get('text', 'N/A')}**\n"
                                   f"Vendor: {vendor.get('vendorName', 'N/A')}\n"
                                   f"URL: {vendor.get('url', 'N/A')}")
        
        else:
            st.warning("⚠️ Coverage details not available. Could not retrieve copay/coinsurance information.")
    
    else:
        st.error("❌ No member policies found in eligibility data.")

def main():
    st.set_page_config(
        page_title="UHC Eligibility & Network Status Checker",
        page_icon="🏥",
        layout="wide"
    )
    
    st.title("🏥 UHC Eligibility & Network Status Checker")
    st.markdown("---")
    
    # Production environment warning
    st.warning("⚠️ **PRODUCTION ENVIRONMENT** - This app is configured to use UHC's production API with real member data.")
    
    # Sidebar for OAuth token management
    st.sidebar.header("🔐 OAuth Token Management")
    
    # Show environment indicator
    st.sidebar.info("🏭 **Environment:** Production")
    
    # Check token status
    token_valid = is_token_valid()
    
    if token_valid:
        st.sidebar.success("✅ Token is valid")
        expires_in = st.session_state.token_expires_at - datetime.now()
        st.sidebar.info(f"Expires in: {str(expires_in).split('.')[0]}")
        
        # Show if token was loaded from file
        if os.path.exists(TOKEN_FILE):
            st.sidebar.info("🔄 Token loaded from saved file")
    else:
        st.sidebar.warning("⚠️ Token expired or not generated")
    
    # Generate token button
    if st.sidebar.button("🔄 Generate OAuth Token", type="primary"):
        with st.sidebar:
            with st.spinner("Generating OAuth token..."):
                result = generate_oauth_token()
                
                if result['success']:
                    st.success("✅ Token generated successfully!")
                    st.info(f"Method used: {result.get('method', 'Unknown')}")
                    st.info(f"Token expires at: {result['expires_at'].strftime('%Y-%m-%d %H:%M:%S')}")
                else:
                    st.error(f"❌ Failed to generate token: {result['error']}")
    
    # Manual token entry as fallback
    st.sidebar.markdown("---")
    st.sidebar.subheader("🔧 Manual Token Entry")
    st.sidebar.markdown("*Use this if automatic generation fails*")
    
    manual_token = st.sidebar.text_area(
        "Paste Bearer Token:",
        placeholder="Bearer eyJ0eXAiOiJKV1Q...",
        height=100
    )
    
    if st.sidebar.button("📝 Use Manual Token"):
        if manual_token and manual_token.startswith("Bearer "):
            st.session_state.oauth_token = manual_token
            # Set expiration to 1 hour from now
            st.session_state.token_expires_at = datetime.now() + timedelta(hours=1)
            st.session_state.token_generated = True
            
            # Save manual token to file for persistence
            save_token_to_file(st.session_state.oauth_token, st.session_state.token_expires_at)
            
            st.sidebar.success("✅ Manual token set successfully!")
        else:
            st.sidebar.error("❌ Please enter a valid Bearer token")
    
    # Clear token button
    if st.sidebar.button("🗑️ Clear Saved Token", help="Clear the saved token file"):
        st.session_state.oauth_token = None
        st.session_state.token_expires_at = None
        st.session_state.token_generated = False
        delete_token_file()
        st.sidebar.success("✅ Token cleared successfully!")
        st.rerun()
    
    # Add a debug button to clear all session state
    if st.sidebar.button("🧹 Clear All Cache", help="Clear all cached search results"):
        # Clear eligibility results
        if 'eligibility_result' in st.session_state:
            del st.session_state.eligibility_result
        if 'member_id' in st.session_state:
            del st.session_state.member_id
        if 'date_of_birth' in st.session_state:
            del st.session_state.date_of_birth
        st.sidebar.success("✅ Cache cleared successfully!")
        st.rerun()
    
    # Show current token status
    if st.session_state.oauth_token:
        with st.sidebar.expander("📋 Token Details"):
            st.text("Token (first 50 chars):")
            st.code(st.session_state.oauth_token[:50] + "...")
            if st.session_state.token_expires_at:
                st.text(f"Expires: {st.session_state.token_expires_at.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Main content - Eligibility Search only
    st.header("🔍 Member Eligibility Search")
    
    # Show token status
    if not token_valid:
        st.warning("⚠️ Please generate an OAuth token first using the sidebar to perform searches.")
    else:
        st.success("✅ OAuth token is valid - ready to perform searches!")
    
    # Eligibility search form - always visible
    col1, col2 = st.columns(2)
    
    with col1:
        member_id = st.text_input("Member ID *", placeholder="Enter member ID")
        date_of_birth_str = st.text_input("Date of Birth *", placeholder="MM/DD/YYYY")
        first_name = st.text_input("First Name", placeholder="Optional")
        last_name = st.text_input("Last Name", placeholder="Optional")
    
    with col2:
        payer_id = st.text_input("Payer ID", placeholder="Optional")
        provider_last_name = st.text_input("Provider Last Name", placeholder="Optional")
        tax_id_number = st.text_input("Tax ID Number", placeholder="Optional")
        search_option = st.selectbox("Search Option", ["memberIDDateOfBirth"])
    
        # Submit button - check token validity on click
    if st.button("🔍 Search Eligibility", type="primary", disabled=not token_valid):
        if not token_valid:
            st.error("❌ Cannot perform search: OAuth token is required. Please generate a token first.")
        elif member_id and date_of_birth_str:
            # Validate and convert date format
            try:
                # Parse MM/DD/YYYY format
                date_of_birth = datetime.strptime(date_of_birth_str, '%m/%d/%Y')
                
                # Show debug information
                st.info(f"🔍 Searching for Member ID: {member_id}")
                st.info(f"📅 Date of Birth: {date_of_birth.strftime('%m/%d/%Y')} (API format: {date_of_birth.strftime('%Y-%m-%d')})")
                
                with st.spinner("Searching member eligibility..."):
                    result = search_member_eligibility(
                        member_id=member_id,
                        date_of_birth=date_of_birth.strftime('%Y-%m-%d'),
                        search_option=search_option,
                        first_name=first_name or None,
                        last_name=last_name or None,
                        payer_id=payer_id or None,
                        provider_last_name=provider_last_name or None,
                        tax_id_number=tax_id_number or None
                    )
                
                if result['success']:
                    st.success("✅ Eligibility search completed successfully!")
                    
                    # Store results in session state
                    st.session_state.eligibility_result = result['data']
                    st.session_state.member_id = member_id
                    st.session_state.date_of_birth = date_of_birth.strftime('%Y-%m-%d')
                    
                    # Display formatted results
                    display_formatted_eligibility_results(result['data'])
                    
                    # Automatically get coverage details for enhanced display
                    eligibility_data = result['data']
                    coverage_data = None
                    
                    # Extract patient key and transaction ID from the first policy
                    if 'memberPolicies' in eligibility_data and len(eligibility_data['memberPolicies']) > 0:
                        first_policy = eligibility_data['memberPolicies'][0]
                        patient_info = first_policy.get('patientInfo', [{}])[0] if first_policy.get('patientInfo') else {}
                        patient_key = patient_info.get('patientKey')
                        transaction_id = first_policy.get('transactionId')
                        
                        if patient_key and transaction_id:
                            st.info("🔄 Automatically fetching enhanced coverage details...")
                            
                            with st.spinner("Retrieving copay and coinsurance details..."):
                                coverage_result = get_enhanced_copay_coinsurance_details(patient_key, transaction_id)
                            
                            if coverage_result['success']:
                                st.success("✅ Coverage details retrieved successfully!")
                                coverage_data = coverage_result['data']
                            else:
                                st.warning(f"⚠️ Could not retrieve coverage details: {coverage_result['error'].get('message', 'Unknown error')}")
                        else:
                            st.warning("⚠️ Missing patient key or transaction ID for coverage lookup")
                    
                    # Display enhanced patient data summary
                    display_enhanced_patient_data(eligibility_data, coverage_data)
                
                else:
                    st.error(f"❌ Search failed: {result['error'].get('message', 'Unknown error')}")
                    st.json(result['error'])
                    
            except ValueError:
                st.error("❌ Invalid date format. Please enter date in MM/DD/YYYY format (e.g., 01/15/1990)")
            except Exception as e:
                st.error(f"❌ Error processing date: {str(e)}")
        else:
            st.error("❌ Please fill in Member ID and Date of Birth")
    
    # Footer
    st.markdown("---")
    st.markdown("*UHC Eligibility & Network Status Checker - Built with Streamlit*")

if __name__ == "__main__":
    main()