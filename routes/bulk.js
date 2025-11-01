const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const OpenAIService = require('../services/openAIService');
const TwilioVoiceService = require('../services/twilioVoiceService');
const { validateLeadData } = require('../utils/validators');
const { DebugLogger } = require('../utils/logger');

// Configure multer for file uploads
const upload = multer({ 
  dest: 'temp/',
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/json' || file.originalname.endsWith('.csv') || file.originalname.endsWith('.json')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and JSON files are allowed'));
    }
  }
});

const prisma = new PrismaClient();
const openAI = new OpenAIService();
const twilioVoice = new TwilioVoiceService();

/**
 * POST /api/bulk/upload-leads
 * Upload a list of leads with comprehensive data for bulk calling
 */
router.post('/upload-leads', async (req, res) => {
  try {
    const { leads, campaign } = req.body;
    
    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({
        success: false,
        error: 'Leads array is required'
      });
    }

    const createdLeads = [];
    const errors = [];
    const validationErrors = [];

    for (let i = 0; i < leads.length; i++) {
      const leadData = leads[i];
      
      try {
        // Validate comprehensive lead data
        const validation = validateLeadData(leadData);
        if (!validation.isValid) {
          validationErrors.push({ 
            index: i, 
            errors: validation.errors, 
            data: leadData 
          });
          continue;
        }

        const validatedData = validation.data;

        // Format phone number
        let phoneNumber = validatedData.phone;
        if (!phoneNumber.startsWith('+1') && phoneNumber.length === 10) {
          phoneNumber = '+1' + phoneNumber;
        }
        validatedData.phone = phoneNumber;

        // Create or update lead with ALL comprehensive data
        const lead = await prisma.lead.upsert({
          where: { phone: phoneNumber },
          update: {
            // Personal Information
            firstName: validatedData.firstName,
            middleInitial: validatedData.middleInitial,
            lastName: validatedData.lastName,
            exactAge: validatedData.exactAge,
            email: validatedData.email,
            
            // Contact Information
            phoneType: validatedData.phoneType,
            
            // Address Information
            address: validatedData.address,
            city: validatedData.city,
            state: validatedData.state,
            zipCode: validatedData.zipCode,
            zipCodePlus4: validatedData.zipCodePlus4,
            latitude: validatedData.latitude,
            longitude: validatedData.longitude,
            
            // Property Information
            homeValue: validatedData.homeValue,
            yearBuilt: validatedData.yearBuilt,
            purchasePrice: validatedData.purchasePrice,
            homePurchaseDate: validatedData.homePurchaseDate ? new Date(validatedData.homePurchaseDate) : null,
            yearsInResidence: validatedData.yearsInResidence,
            propertyType: validatedData.propertyType,
            
            // Financial Information
            mostRecentMortgageDate: validatedData.mostRecentMortgageDate ? new Date(validatedData.mostRecentMortgageDate) : null,
            mostRecentMortgageAmount: validatedData.mostRecentMortgageAmount,
            loanToValue: validatedData.loanToValue,
            estimatedIncome: validatedData.estimatedIncome,
            estimatedIncomeCode: validatedData.estimatedIncomeCode,
            
            // Personal Demographics
            maritalStatus: validatedData.maritalStatus,
            presenceOfChildren: validatedData.presenceOfChildren,
            numberOfChildren: validatedData.numberOfChildren,
            education: validatedData.education,
            occupation: validatedData.occupation,
            language: validatedData.language,
            
            // Compliance
            dncStatus: validatedData.dncStatus,
            
            // Business Information
            company: validatedData.company,
            industry: validatedData.industry,
            
            // Lead Management
            source: campaign || 'bulk_upload',
            notes: validatedData.notes
          },
          create: {
            // Personal Information
            firstName: validatedData.firstName,
            middleInitial: validatedData.middleInitial,
            lastName: validatedData.lastName,
            exactAge: validatedData.exactAge,
            email: validatedData.email,
            
            // Contact Information
            phone: phoneNumber,
            phoneType: validatedData.phoneType,
            
            // Address Information
            address: validatedData.address,
            city: validatedData.city,
            state: validatedData.state,
            zipCode: validatedData.zipCode,
            zipCodePlus4: validatedData.zipCodePlus4,
            latitude: validatedData.latitude,
            longitude: validatedData.longitude,
            
            // Property Information
            homeValue: validatedData.homeValue,
            yearBuilt: validatedData.yearBuilt,
            purchasePrice: validatedData.purchasePrice,
            homePurchaseDate: validatedData.homePurchaseDate ? new Date(validatedData.homePurchaseDate) : null,
            yearsInResidence: validatedData.yearsInResidence,
            propertyType: validatedData.propertyType,
            
            // Financial Information
            mostRecentMortgageDate: validatedData.mostRecentMortgageDate ? new Date(validatedData.mostRecentMortgageDate) : null,
            mostRecentMortgageAmount: validatedData.mostRecentMortgageAmount,
            loanToValue: validatedData.loanToValue,
            estimatedIncome: validatedData.estimatedIncome,
            estimatedIncomeCode: validatedData.estimatedIncomeCode,
            
            // Personal Demographics
            maritalStatus: validatedData.maritalStatus,
            presenceOfChildren: validatedData.presenceOfChildren,
            numberOfChildren: validatedData.numberOfChildren,
            education: validatedData.education,
            occupation: validatedData.occupation,
            language: validatedData.language,
            
            // Compliance
            dncStatus: validatedData.dncStatus,
            
            // Business Information
            company: validatedData.company,
            industry: validatedData.industry,
            
            // Lead Management
            source: campaign || 'bulk_upload',
            notes: validatedData.notes,
            status: 'NEW'
          }
        });

        createdLeads.push(lead);
        
      } catch (error) {
        errors.push({ index: i, error: error.message, data: leadData });
      }
    }

    DebugLogger.logSuccess('Comprehensive bulk leads uploaded', {
      total: leads.length,
      created: createdLeads.length,
      validationErrors: validationErrors.length,
      systemErrors: errors.length
    });

    res.json({
      success: true,
      message: `Successfully processed ${createdLeads.length} leads with comprehensive data`,
      results: {
        total: leads.length,
        created: createdLeads.length,
        validationErrors: validationErrors.length,
        systemErrors: errors.length,
        leads: createdLeads,
        validationErrorDetails: validationErrors,
        systemErrorDetails: errors
      }
    });

  } catch (error) {
    DebugLogger.logSystemError(error, 'comprehensive_bulk_upload');
    res.status(500).json({
      success: false,
      error: 'Failed to upload comprehensive leads',
      message: error.message
    });
  }
});

/**
 * POST /api/bulk/upload-file
 * Upload CSV or JSON file with comprehensive lead data
 */
router.post('/upload-file', upload.single('leadFile'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { campaign } = req.body;
    const filePath = req.file.path;
    const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
    
    let leads = [];

    try {
      if (fileExtension === 'csv') {
        // Parse CSV file
        leads = await parseCSVFile(filePath);
      } else if (fileExtension === 'json') {
        // Parse JSON file
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const jsonData = JSON.parse(fileContent);
        leads = Array.isArray(jsonData) ? jsonData : [jsonData];
      } else {
        throw new Error('Unsupported file format. Only CSV and JSON files are supported.');
      }

      // Clean up uploaded file
      fs.unlinkSync(filePath);

      // Process leads using existing upload logic
      const createdLeads = [];
      const errors = [];
      const validationErrors = [];

      for (let i = 0; i < leads.length; i++) {
        const leadData = leads[i];
        
        try {
          // Validate comprehensive lead data
          const validation = validateLeadData(leadData);
          if (!validation.isValid) {
            validationErrors.push({ 
              index: i, 
              errors: validation.errors, 
              data: leadData 
            });
            continue;
          }

          const validatedData = validation.data;

          // Format phone number
          let phoneNumber = validatedData.phone;
          if (!phoneNumber.startsWith('+1') && phoneNumber.length === 10) {
            phoneNumber = '+1' + phoneNumber;
          }
          validatedData.phone = phoneNumber;

          // Create or update lead with comprehensive data
          const lead = await prisma.lead.upsert({
            where: { phone: phoneNumber },
            update: {
              ...buildLeadUpdateData(validatedData, campaign)
            },
            create: {
              ...buildLeadCreateData(validatedData, phoneNumber, campaign)
            }
          });

          createdLeads.push(lead);
          
        } catch (error) {
          errors.push({ index: i, error: error.message, data: leadData });
        }
      }

      DebugLogger.logSuccess('File upload processed', {
        filename: req.file.originalname,
        total: leads.length,
        created: createdLeads.length,
        validationErrors: validationErrors.length,
        systemErrors: errors.length
      });

      res.json({
        success: true,
        message: `Successfully processed ${createdLeads.length} leads from ${req.file.originalname}`,
        results: {
          filename: req.file.originalname,
          total: leads.length,
          created: createdLeads.length,
          validationErrors: validationErrors.length,
          systemErrors: errors.length,
          leads: createdLeads,
          validationErrorDetails: validationErrors,
          systemErrorDetails: errors
        }
      });

    } catch (parseError) {
      // Clean up uploaded file on error
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      
      throw new Error(`Failed to parse file: ${parseError.message}`);
    }

  } catch (error) {
    DebugLogger.logSystemError(error, 'file_upload');
    res.status(500).json({
      success: false,
      error: 'Failed to process uploaded file',
      message: error.message
    });
  }
});

/**
 * Parse CSV file and return array of lead objects
 */
function parseCSVFile(filePath) {
  return new Promise((resolve, reject) => {
    const leads = [];
    
    fs.createReadStream(filePath)
      .pipe(csv({
        // Map CSV headers to our field names
        mapHeaders: ({ header }) => {
          const headerMap = {
            'FIRST NAME': 'firstName',
            'MIDDLE INITIAL': 'middleInitial', 
            'LAST NAME': 'lastName',
            'ADDRESS': 'address',
            'CITY': 'city',
            'STATE': 'state',
            'ZIP CODE': 'zipCode',
            'ZIP CODE +4': 'zipCodePlus4',
            'PHONE': 'phone',
            'PHONE TYPE': 'phoneType',
            'EMAIL': 'email',
            'LATITUDE': 'latitude',
            'LONGITUDE': 'longitude',
            'EXACT AGE': 'exactAge',
            'HOME VALUE (ASSESSED)': 'homeValue',
            'YEAR BUILT': 'yearBuilt',
            'ESTIMATED INCOME (CODE)': 'estimatedIncomeCode',
            'LOAN TO VALUE': 'loanToValue',
            'MOST RECENT MORTGAGE DATE': 'mostRecentMortgageDate',
            'MOST RECENT MORTGAGE AMOUNT': 'mostRecentMortgageAmount',
            'HOME PURCHASE DATE': 'homePurchaseDate',
            'PURCHASE PRICE': 'purchasePrice',
            'DNC': 'dncStatus',
            'YEARS IN RESIDENCE': 'yearsInResidence',
            'PRESENCE OF CHILDREN': 'presenceOfChildren',
            'MARITAL STATUS': 'maritalStatus',
            'ESTIMATED INCOME': 'estimatedIncome',
            'EDUCATION': 'education',
            'PROPERTY TYPE': 'propertyType',
            'OCCUPATION': 'occupation',
            'LANGUAGE': 'language',
            'NUMBER OF CHILDREN': 'numberOfChildren'
          };
          
          return headerMap[header.toUpperCase()] || header.toLowerCase().replace(/\s+/g, '');
        }
      }))
      .on('data', (data) => {
        // Convert string values to appropriate types
        const processedData = {};
        
        Object.keys(data).forEach(key => {
          let value = data[key];
          
          // Skip empty values
          if (value === '' || value === null || value === undefined) {
            return;
          }
          
          // Convert numeric fields
          if (['exactAge', 'yearBuilt', 'yearsInResidence', 'numberOfChildren'].includes(key)) {
            value = parseInt(value);
          } else if (['homeValue', 'purchasePrice', 'mostRecentMortgageAmount', 'estimatedIncome', 'latitude', 'longitude', 'loanToValue'].includes(key)) {
            value = parseFloat(value);
          } else if (['presenceOfChildren', 'dncStatus'].includes(key)) {
            value = value.toLowerCase() === 'true' || value === '1' || value.toLowerCase() === 'yes';
          }
          
          processedData[key] = value;
        });
        
        leads.push(processedData);
      })
      .on('end', () => {
        resolve(leads);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Build lead update data object
 */
function buildLeadUpdateData(validatedData, campaign) {
  return {
    // Personal Information
    firstName: validatedData.firstName,
    middleInitial: validatedData.middleInitial,
    lastName: validatedData.lastName,
    exactAge: validatedData.exactAge,
    email: validatedData.email,
    
    // Contact Information
    phoneType: validatedData.phoneType,
    
    // Address Information
    address: validatedData.address,
    city: validatedData.city,
    state: validatedData.state,
    zipCode: validatedData.zipCode,
    zipCodePlus4: validatedData.zipCodePlus4,
    latitude: validatedData.latitude,
    longitude: validatedData.longitude,
    
    // Property Information
    homeValue: validatedData.homeValue,
    yearBuilt: validatedData.yearBuilt,
    purchasePrice: validatedData.purchasePrice,
    homePurchaseDate: validatedData.homePurchaseDate ? new Date(validatedData.homePurchaseDate) : null,
    yearsInResidence: validatedData.yearsInResidence,
    propertyType: validatedData.propertyType,
    
    // Financial Information
    mostRecentMortgageDate: validatedData.mostRecentMortgageDate ? new Date(validatedData.mostRecentMortgageDate) : null,
    mostRecentMortgageAmount: validatedData.mostRecentMortgageAmount,
    loanToValue: validatedData.loanToValue,
    estimatedIncome: validatedData.estimatedIncome,
    estimatedIncomeCode: validatedData.estimatedIncomeCode,
    
    // Personal Demographics
    maritalStatus: validatedData.maritalStatus,
    presenceOfChildren: validatedData.presenceOfChildren,
    numberOfChildren: validatedData.numberOfChildren,
    education: validatedData.education,
    occupation: validatedData.occupation,
    language: validatedData.language,
    
    // Compliance
    dncStatus: validatedData.dncStatus,
    
    // Business Information
    company: validatedData.company,
    industry: validatedData.industry,
    
    // Lead Management
    source: campaign || 'file_upload',
    notes: validatedData.notes
  };
}

/**
 * Build lead create data object
 */
function buildLeadCreateData(validatedData, phoneNumber, campaign) {
  return {
    // Personal Information
    firstName: validatedData.firstName,
    middleInitial: validatedData.middleInitial,
    lastName: validatedData.lastName,
    exactAge: validatedData.exactAge,
    email: validatedData.email,
    
    // Contact Information
    phone: phoneNumber,
    phoneType: validatedData.phoneType,
    
    // Address Information
    address: validatedData.address,
    city: validatedData.city,
    state: validatedData.state,
    zipCode: validatedData.zipCode,
    zipCodePlus4: validatedData.zipCodePlus4,
    latitude: validatedData.latitude,
    longitude: validatedData.longitude,
    
    // Property Information
    homeValue: validatedData.homeValue,
    yearBuilt: validatedData.yearBuilt,
    purchasePrice: validatedData.purchasePrice,
    homePurchaseDate: validatedData.homePurchaseDate ? new Date(validatedData.homePurchaseDate) : null,
    yearsInResidence: validatedData.yearsInResidence,
    propertyType: validatedData.propertyType,
    
    // Financial Information
    mostRecentMortgageDate: validatedData.mostRecentMortgageDate ? new Date(validatedData.mostRecentMortgageDate) : null,
    mostRecentMortgageAmount: validatedData.mostRecentMortgageAmount,
    loanToValue: validatedData.loanToValue,
    estimatedIncome: validatedData.estimatedIncome,
    estimatedIncomeCode: validatedData.estimatedIncomeCode,
    
    // Personal Demographics
    maritalStatus: validatedData.maritalStatus,
    presenceOfChildren: validatedData.presenceOfChildren,
    numberOfChildren: validatedData.numberOfChildren,
    education: validatedData.education,
    occupation: validatedData.occupation,
    language: validatedData.language,
    
    // Compliance
    dncStatus: validatedData.dncStatus,
    
    // Business Information
    company: validatedData.company,
    industry: validatedData.industry,
    
    // Lead Management
    source: campaign || 'file_upload',
    notes: validatedData.notes,
    status: 'NEW'
  };
}

/**
 * POST /api/bulk/start-campaign
 * Start calling a list of leads
 */
router.post('/start-campaign', async (req, res) => {
  try {
    const { 
      leadIds, 
      campaignName, 
      callScript, 
      delayBetweenCalls = 30, // seconds
      maxConcurrentCalls = 3 
    } = req.body;

    if (!leadIds || !Array.isArray(leadIds)) {
      return res.status(400).json({
        success: false,
        error: 'Lead IDs array is required'
      });
    }

    // Create campaign record
    const campaign = await prisma.campaign.create({
      data: {
        name: campaignName || `Campaign ${new Date().toISOString()}`,
        status: 'RUNNING',
        totalLeads: leadIds.length,
        completedCalls: 0,
        successfulCalls: 0,
        script: callScript,
        createdAt: new Date()
      }
    });

    // Start calling process
    startBulkCalling(campaign.id, leadIds, delayBetweenCalls, maxConcurrentCalls);

    res.json({
      success: true,
      campaign: campaign,
      message: `Campaign started with ${leadIds.length} leads`
    });

  } catch (error) {
    DebugLogger.logSystemError(error, 'start_campaign');
    res.status(500).json({
      success: false,
      error: 'Failed to start campaign',
      message: error.message
    });
  }
});

/**
 * GET /api/bulk/campaigns
 * Get all campaigns and their status
 */
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        calls: {
          select: {
            id: true,
            status: true,
            outcome: true,
            duration: true,
            createdAt: true
          }
        }
      }
    });

    res.json({
      success: true,
      campaigns: campaigns
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campaigns'
    });
  }
});

/**
 * Background function to handle bulk calling
 */
async function startBulkCalling(campaignId, leadIds, delayBetweenCalls, maxConcurrentCalls) {
  let currentCalls = 0;
  let completedCalls = 0;
  
  for (const leadId of leadIds) {
    try {
      // Wait if we've reached max concurrent calls
      while (currentCalls >= maxConcurrentCalls) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Start the call (don't await - let it run in background)
      currentCalls++;
      makeIndividualCall(campaignId, leadId)
        .finally(() => {
          currentCalls--;
          completedCalls++;
          
          // Update campaign progress
          updateCampaignProgress(campaignId, completedCalls, leadIds.length);
        });

      // Wait before next call
      if (delayBetweenCalls > 0) {
        await new Promise(resolve => setTimeout(resolve, delayBetweenCalls * 1000));
      }

    } catch (error) {
      DebugLogger.logCallError(leadId, error, 'bulk_calling');
      currentCalls--;
    }
  }
}

/**
 * Make an individual call as part of bulk campaign
 */
async function makeIndividualCall(campaignId, leadId) {
  try {
    const lead = await prisma.lead.findUnique({
      where: { id: leadId }
    });

    if (!lead) {
      throw new Error(`Lead ${leadId} not found`);
    }

    // Create call record
    const call = await prisma.call.create({
      data: {
        leadId: leadId,
        campaignId: campaignId,
        status: 'SCHEDULED',
        scheduledAt: new Date()
      }
    });

    // Generate personalized script
    const script = await openAI.generatePersonalizedScript(lead, 'cold_call');

    // Format phone number
    let phoneNumber = lead.phone;
    if (!phoneNumber.startsWith('+')) {
      phoneNumber = '+1' + phoneNumber;
    }

    // Initiate Twilio call
    const callResult = await twilioVoice.initiateCall(phoneNumber, call.id, lead);

    // Update call with Twilio info
    await prisma.call.update({
      where: { id: call.id },
      data: {
        status: 'IN_PROGRESS',
        twilioCallSid: callResult.twilioCallSid,
        startedAt: new Date()
      }
    });

    DebugLogger.logSuccess('Bulk call initiated', {
      campaignId,
      leadId,
      callId: call.id,
      phone: phoneNumber
    });

    return { success: true, callId: call.id };

  } catch (error) {
    DebugLogger.logCallError(leadId, error, 'individual_call');
    
    // Update call as failed
    await prisma.call.updateMany({
      where: { leadId: leadId, campaignId: campaignId },
      data: { status: 'FAILED', outcome: 'ERROR' }
    });

    throw error;
  }
}

/**
 * Update campaign progress
 */
async function updateCampaignProgress(campaignId, completedCalls, totalLeads) {
  try {
    const campaign = await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        completedCalls: completedCalls,
        status: completedCalls >= totalLeads ? 'COMPLETED' : 'RUNNING'
      }
    });

    DebugLogger.logSuccess('Campaign progress updated', {
      campaignId,
      completedCalls,
      totalLeads,
      status: campaign.status
    });

  } catch (error) {
    DebugLogger.logSystemError(error, 'campaign_progress');
  }
}

module.exports = router;
