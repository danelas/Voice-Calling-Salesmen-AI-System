const { 
  validateLeadData, 
  validateCallOutcome, 
  validatePagination, 
  validateSearchParams,
  validateBulkLeads 
} = require('../utils/validators');

/**
 * Middleware to validate lead creation data
 */
const validateCreateLead = (req, res, next) => {
  const validation = validateLeadData(req.body);
  
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validation.errors
    });
  }

  req.validatedData = validation.data;
  next();
};

/**
 * Middleware to validate lead update data
 */
const validateUpdateLead = (req, res, next) => {
  // For updates, we only validate provided fields
  const updateData = {};
  const errors = [];

  if (req.body.firstName !== undefined) {
    if (!req.body.firstName || typeof req.body.firstName !== 'string') {
      errors.push('First name must be a non-empty string');
    } else {
      updateData.firstName = req.body.firstName.trim();
    }
  }

  if (req.body.lastName !== undefined) {
    if (!req.body.lastName || typeof req.body.lastName !== 'string') {
      errors.push('Last name must be a non-empty string');
    } else {
      updateData.lastName = req.body.lastName.trim();
    }
  }

  if (req.body.phone !== undefined) {
    const { validatePhoneNumber } = require('../utils/validators');
    const phoneValidation = validatePhoneNumber(req.body.phone);
    if (!phoneValidation.isValid) {
      errors.push(phoneValidation.error);
    } else {
      updateData.phone = phoneValidation.formatted;
    }
  }

  if (req.body.email !== undefined) {
    const { validateEmail } = require('../utils/validators');
    const emailValidation = validateEmail(req.body.email);
    if (!emailValidation.isValid) {
      errors.push(emailValidation.error);
    } else {
      updateData.email = emailValidation.formatted;
    }
  }

  // Optional fields
  ['company', 'industry', 'source', 'notes', 'status'].forEach(field => {
    if (req.body[field] !== undefined) {
      updateData[field] = req.body[field];
    }
  });

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  req.validatedData = updateData;
  next();
};

/**
 * Middleware to validate call outcome
 */
const validateCallEnd = (req, res, next) => {
  const errors = [];
  const validatedData = {};

  if (req.body.outcome) {
    const outcomeValidation = validateCallOutcome(req.body.outcome);
    if (!outcomeValidation.isValid) {
      errors.push(outcomeValidation.error);
    } else {
      validatedData.outcome = outcomeValidation.outcome;
    }
  }

  if (req.body.notes !== undefined) {
    validatedData.notes = req.body.notes;
  }

  if (req.body.followUpDate) {
    const { validateDate } = require('../utils/validators');
    const dateValidation = validateDate(req.body.followUpDate, 'follow-up date');
    if (!dateValidation.isValid) {
      errors.push(dateValidation.error);
    } else {
      validatedData.followUpDate = dateValidation.date;
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  req.validatedData = validatedData;
  next();
};

/**
 * Middleware to validate pagination parameters
 */
const validatePaginationParams = (req, res, next) => {
  const validation = validatePagination(req.query);
  
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Invalid pagination parameters',
      details: [validation.error]
    });
  }

  req.pagination = validation.data;
  next();
};

/**
 * Middleware to validate search parameters
 */
const validateSearchParameters = (req, res, next) => {
  const validation = validateSearchParams(req.query);
  
  if (!validation.isValid) {
    return res.status(400).json({
      error: 'Invalid search parameters',
      details: validation.errors
    });
  }

  req.searchParams = validation.data;
  next();
};

/**
 * Middleware to validate bulk lead creation
 */
const validateBulkLeadCreation = (req, res, next) => {
  if (!req.body.leads) {
    return res.status(400).json({
      error: 'Missing leads array in request body'
    });
  }

  const validation = validateBulkLeads(req.body.leads);
  
  if (!validation.isValid && validation.results.valid.length === 0) {
    return res.status(400).json({
      error: 'No valid leads found',
      details: validation.results.invalid.map(item => ({
        index: item.index,
        errors: item.errors
      }))
    });
  }

  req.validatedLeads = validation.results;
  req.bulkSummary = validation.summary;
  next();
};

/**
 * Middleware to validate call initiation data
 */
const validateCallInitiation = (req, res, next) => {
  const errors = [];
  const validatedData = {};

  if (!req.body.leadId || typeof req.body.leadId !== 'string') {
    errors.push('Lead ID is required and must be a string');
  } else {
    validatedData.leadId = req.body.leadId;
  }

  if (req.body.scheduledAt) {
    const { validateDate } = require('../utils/validators');
    const dateValidation = validateDate(req.body.scheduledAt, 'scheduled date');
    if (!dateValidation.isValid) {
      errors.push(dateValidation.error);
    } else {
      validatedData.scheduledAt = dateValidation.date;
    }
  }

  if (req.body.callType) {
    const validCallTypes = ['cold', 'warm', 'follow_up', 'demo', 'closing'];
    if (!validCallTypes.includes(req.body.callType.toLowerCase())) {
      errors.push(`Invalid call type. Must be one of: ${validCallTypes.join(', ')}`);
    } else {
      validatedData.callType = req.body.callType.toLowerCase();
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  req.validatedData = validatedData;
  next();
};

/**
 * Middleware to validate call interaction data
 */
const validateCallInteraction = (req, res, next) => {
  const errors = [];
  const validatedData = {};

  if (!req.body.customerMessage || typeof req.body.customerMessage !== 'string') {
    errors.push('Customer message is required and must be a string');
  } else {
    const { sanitizeText } = require('../utils/validators');
    validatedData.customerMessage = sanitizeText(req.body.customerMessage);
    
    if (validatedData.customerMessage.length === 0) {
      errors.push('Customer message cannot be empty after sanitization');
    }
  }

  if (req.body.conversationHistory && !Array.isArray(req.body.conversationHistory)) {
    errors.push('Conversation history must be an array');
  } else {
    validatedData.conversationHistory = req.body.conversationHistory || [];
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors
    });
  }

  req.validatedData = validatedData;
  next();
};

/**
 * Middleware to validate UUID parameters
 */
const validateUUIDParam = (paramName) => {
  return (req, res, next) => {
    const uuid = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (!uuid || !uuidRegex.test(uuid)) {
      return res.status(400).json({
        error: `Invalid ${paramName} format`,
        details: [`${paramName} must be a valid UUID`]
      });
    }

    next();
  };
};

/**
 * Middleware to validate analytics query parameters
 */
const validateAnalyticsParams = (req, res, next) => {
  const errors = [];
  const validatedData = {};

  // Validate timeframe
  if (req.query.timeframe) {
    const validTimeframes = ['7d', '30d', '90d', '1y'];
    if (!validTimeframes.includes(req.query.timeframe)) {
      errors.push(`Invalid timeframe. Must be one of: ${validTimeframes.join(', ')}`);
    } else {
      validatedData.timeframe = req.query.timeframe;
    }
  }

  // Validate metric
  if (req.query.metric) {
    const validMetrics = ['success_rate', 'call_volume', 'duration', 'engagement'];
    if (!validMetrics.includes(req.query.metric)) {
      errors.push(`Invalid metric. Must be one of: ${validMetrics.join(', ')}`);
    } else {
      validatedData.metric = req.query.metric;
    }
  }

  // Validate date range
  if (req.query.startDate || req.query.endDate) {
    const { validateDate } = require('../utils/validators');
    
    if (req.query.startDate) {
      const startDateValidation = validateDate(req.query.startDate, 'start date');
      if (!startDateValidation.isValid) {
        errors.push(startDateValidation.error);
      } else {
        validatedData.startDate = startDateValidation.date;
      }
    }

    if (req.query.endDate) {
      const endDateValidation = validateDate(req.query.endDate, 'end date');
      if (!endDateValidation.isValid) {
        errors.push(endDateValidation.error);
      } else {
        validatedData.endDate = endDateValidation.date;
      }
    }

    // Ensure start date is before end date
    if (validatedData.startDate && validatedData.endDate && validatedData.startDate > validatedData.endDate) {
      errors.push('Start date must be before end date');
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      error: 'Invalid analytics parameters',
      details: errors
    });
  }

  req.analyticsParams = validatedData;
  next();
};

module.exports = {
  validateCreateLead,
  validateUpdateLead,
  validateCallEnd,
  validatePaginationParams,
  validateSearchParameters,
  validateBulkLeadCreation,
  validateCallInitiation,
  validateCallInteraction,
  validateUUIDParam,
  validateAnalyticsParams
};
