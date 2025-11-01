# Lead Upload Guide

## Overview
Your Voice Sales AI system supports comprehensive lead data upload through multiple methods. All lead data is validated and used to create highly personalized AI conversations.

## Upload Methods

### 1. CSV File Upload (Recommended)
**Endpoint:** `POST /api/bulk/upload-file`
**Content-Type:** `multipart/form-data`

Upload a CSV file with comprehensive lead data using the exact column headers shown in `lead-upload-template.csv`.

**Example using curl:**
```bash
curl -X POST \
  http://localhost:3001/api/bulk/upload-file \
  -F "leadFile=@your-leads.csv" \
  -F "campaign=Q4 2024 Campaign"
```

**Example using JavaScript/Fetch:**
```javascript
const formData = new FormData();
formData.append('leadFile', fileInput.files[0]);
formData.append('campaign', 'Q4 2024 Campaign');

fetch('/api/bulk/upload-file', {
  method: 'POST',
  body: formData
})
.then(response => response.json())
.then(data => console.log(data));
```

### 2. JSON Array Upload
**Endpoint:** `POST /api/bulk/upload-leads`
**Content-Type:** `application/json`

Upload an array of lead objects directly.

**Example:**
```javascript
fetch('/api/bulk/upload-leads', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    campaign: 'Q4 2024 Campaign',
    leads: [
      {
        firstName: 'Maria',
        middleInitial: 'C',
        lastName: 'Rodriguez',
        phone: '3055551234',
        email: 'maria.rodriguez@email.com',
        address: '1234 Coral Way',
        city: 'Miami',
        state: 'FL',
        zipCode: '33145',
        exactAge: 42,
        homeValue: 485000,
        language: 'es',
        // ... all other fields
      }
    ]
  })
})
```

### 3. JSON File Upload
**Endpoint:** `POST /api/bulk/upload-file`
**Content-Type:** `multipart/form-data`

Upload a JSON file containing an array of lead objects.

## Required Fields
- `firstName` (string)
- `lastName` (string) 
- `phone` (string) - Will be formatted automatically

## All Supported Fields

### Personal Information
- `firstName` (string) - Required
- `middleInitial` (string) - Single character
- `lastName` (string) - Required
- `exactAge` (number) - Age in years
- `email` (string) - Valid email address

### Contact Information
- `phone` (string) - Required, auto-formatted
- `phoneType` (string) - Mobile, Home, Work, etc.

### Address Information
- `address` (string) - Street address
- `city` (string) - City name
- `state` (string) - State abbreviation
- `zipCode` (string) - ZIP code
- `zipCodePlus4` (string) - ZIP+4 extension
- `latitude` (number) - Geographic latitude
- `longitude` (number) - Geographic longitude

### Property Information
- `homeValue` (number) - Assessed home value
- `yearBuilt` (number) - Year home was built
- `purchasePrice` (number) - Original purchase price
- `homePurchaseDate` (date) - Date purchased (YYYY-MM-DD)
- `yearsInResidence` (number) - Years at current address
- `propertyType` (string) - Single Family, Condo, etc.

### Financial Information
- `mostRecentMortgageDate` (date) - Date of recent mortgage
- `mostRecentMortgageAmount` (number) - Recent mortgage amount
- `loanToValue` (number) - Loan-to-value ratio (0.0-2.0)
- `estimatedIncome` (number) - Annual income estimate
- `estimatedIncomeCode` (string) - Income range code

### Personal Demographics
- `maritalStatus` (string) - Single, Married, Divorced, etc.
- `presenceOfChildren` (boolean) - Has children
- `numberOfChildren` (number) - Number of children
- `education` (string) - Education level
- `occupation` (string) - Job/occupation
- `language` (string) - Language code (en, es, fr, etc.)

### Compliance & Business
- `dncStatus` (boolean) - Do Not Call status
- `company` (string) - Company name
- `industry` (string) - Industry type

### Lead Management
- `source` (string) - Lead source
- `notes` (string) - Additional notes

## CSV Header Mapping
The system automatically maps these CSV headers to database fields:

| CSV Header | Database Field |
|------------|----------------|
| FIRST NAME | firstName |
| MIDDLE INITIAL | middleInitial |
| LAST NAME | lastName |
| PHONE | phone |
| EMAIL | email |
| ADDRESS | address |
| CITY | city |
| STATE | state |
| ZIP CODE | zipCode |
| ZIP CODE +4 | zipCodePlus4 |
| EXACT AGE | exactAge |
| HOME VALUE (ASSESSED) | homeValue |
| YEAR BUILT | yearBuilt |
| PURCHASE PRICE | purchasePrice |
| MOST RECENT MORTGAGE AMOUNT | mostRecentMortgageAmount |
| ESTIMATED INCOME | estimatedIncome |
| LANGUAGE | language |
| ... and all other fields |

## Response Format
All upload endpoints return:

```json
{
  "success": true,
  "message": "Successfully processed X leads",
  "results": {
    "total": 100,
    "created": 95,
    "validationErrors": 3,
    "systemErrors": 2,
    "leads": [...],
    "validationErrorDetails": [...],
    "systemErrorDetails": [...]
  }
}
```

## Error Handling
- **Validation Errors:** Invalid data format, missing required fields
- **System Errors:** Database issues, processing failures
- **File Errors:** Unsupported format, corrupted files

## Data Usage in AI Conversations
All uploaded data is used to create highly personalized conversations:

- **Location references:** "I know the Miami market has been strong..."
- **Property details:** "With your home built in 1995 and current value of $485,000..."
- **Financial context:** "Given your mortgage balance and years of ownership..."
- **Personal touch:** "As a marketing manager with two children..."
- **Language support:** Automatic language detection and offers

## Best Practices
1. **Use CSV format** for large datasets
2. **Include as much data as possible** for better personalization
3. **Validate phone numbers** before upload
4. **Check DNC status** to ensure compliance
5. **Use consistent date formats** (YYYY-MM-DD)
6. **Test with small batches** first

## Example Files
- `lead-upload-template.csv` - CSV template with sample data
- `comprehensive-lead-example.json` - JSON example with all fields

## Starting Campaigns
After uploading leads, start calling campaigns:

```javascript
fetch('/api/bulk/start-campaign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    leadIds: ['lead1', 'lead2', 'lead3'],
    campaignName: 'Q4 2024 Outreach',
    delayBetweenCalls: 30,
    maxConcurrentCalls: 3
  })
})
```
