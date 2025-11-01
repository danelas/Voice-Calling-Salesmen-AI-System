/**
 * Validation utilities for the Voice Sales AI system
 */

/**
 * Validate phone number format
 * @param {string} phone - Phone number to validate
 * @returns {Object} Validation result
 */
function validatePhoneNumber(phone) {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'Phone number is required' };
  }

  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  // Check if it's a valid international format
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  
  if (!phoneRegex.test(cleaned)) {
    return { 
      isValid: false, 
      error: 'Invalid phone number format. Use international format (+1234567890)' 
    };
  }

  return { 
    isValid: true, 
    formatted: cleaned.startsWith('+') ? cleaned : '+' + cleaned 
  };
}

/**
 * Validate email address
 * @param {string} email - Email to validate
 * @returns {Object} Validation result
 */
function validateEmail(email) {
  if (!email) {
    return { isValid: true }; // Email is optional
  }

  if (typeof email !== 'string') {
    return { isValid: false, error: 'Email must be a string' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Invalid email format' };
  }

  return { isValid: true, formatted: email.toLowerCase() };
}

/**
 * Validate lead data
 * @param {Object} leadData - Lead data to validate
 * @returns {Object} Validation result
 */
function validateLeadData(leadData) {
  const errors = [];
  const validated = {};

  // Required fields
  if (!leadData.firstName || typeof leadData.firstName !== 'string') {
    errors.push('First name is required');
  } else {
    validated.firstName = leadData.firstName.trim();
  }

  if (!leadData.lastName || typeof leadData.lastName !== 'string') {
    errors.push('Last name is required');
  } else {
    validated.lastName = leadData.lastName.trim();
  }

  // Phone validation
  const phoneValidation = validatePhoneNumber(leadData.phone);
  if (!phoneValidation.isValid) {
    errors.push(phoneValidation.error);
  } else {
    validated.phone = phoneValidation.formatted;
  }

  // Email validation (optional)
  if (leadData.email) {
    const emailValidation = validateEmail(leadData.email);
    if (!emailValidation.isValid) {
      errors.push(emailValidation.error);
    } else {
      validated.email = emailValidation.formatted;
    }
  }

  // Personal Information
  if (leadData.middleInitial) {
    validated.middleInitial = leadData.middleInitial.trim().substring(0, 1);
  }

  if (leadData.exactAge !== undefined && leadData.exactAge !== null) {
    const age = parseInt(leadData.exactAge);
    if (isNaN(age) || age < 18 || age > 120) {
      errors.push('Age must be a valid number between 18 and 120');
    } else {
      validated.exactAge = age;
    }
  }

  // Contact Information
  if (leadData.phoneType) {
    validated.phoneType = leadData.phoneType.trim();
  }

  // Address fields
  if (leadData.address) {
    validated.address = leadData.address.trim();
  }
  if (leadData.city) {
    validated.city = leadData.city.trim();
  }
  if (leadData.state) {
    validated.state = leadData.state.trim();
  }
  if (leadData.zipCode) {
    validated.zipCode = leadData.zipCode.trim();
  }
  if (leadData.zipCodePlus4) {
    validated.zipCodePlus4 = leadData.zipCodePlus4.trim();
  }

  // Geographic coordinates
  if (leadData.latitude !== undefined && leadData.latitude !== null) {
    const lat = parseFloat(leadData.latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      errors.push('Latitude must be a valid number between -90 and 90');
    } else {
      validated.latitude = lat;
    }
  }

  if (leadData.longitude !== undefined && leadData.longitude !== null) {
    const lng = parseFloat(leadData.longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      errors.push('Longitude must be a valid number between -180 and 180');
    } else {
      validated.longitude = lng;
    }
  }

  // Property Information
  if (leadData.homeValue !== undefined && leadData.homeValue !== null) {
    const value = parseFloat(leadData.homeValue);
    if (isNaN(value) || value < 0) {
      errors.push('Home value must be a valid positive number');
    } else {
      validated.homeValue = value;
    }
  }

  if (leadData.yearBuilt !== undefined && leadData.yearBuilt !== null) {
    const year = parseInt(leadData.yearBuilt);
    const currentYear = new Date().getFullYear();
    if (isNaN(year) || year < 1800 || year > currentYear) {
      errors.push(`Year built must be between 1800 and ${currentYear}`);
    } else {
      validated.yearBuilt = year;
    }
  }

  if (leadData.purchasePrice !== undefined && leadData.purchasePrice !== null) {
    const price = parseFloat(leadData.purchasePrice);
    if (isNaN(price) || price < 0) {
      errors.push('Purchase price must be a valid positive number');
    } else {
      validated.purchasePrice = price;
    }
  }

  if (leadData.homePurchaseDate) {
    const date = new Date(leadData.homePurchaseDate);
    if (isNaN(date.getTime())) {
      errors.push('Home purchase date must be a valid date');
    } else {
      validated.homePurchaseDate = leadData.homePurchaseDate;
    }
  }

  if (leadData.yearsInResidence !== undefined && leadData.yearsInResidence !== null) {
    const years = parseInt(leadData.yearsInResidence);
    if (isNaN(years) || years < 0 || years > 100) {
      errors.push('Years in residence must be a valid number between 0 and 100');
    } else {
      validated.yearsInResidence = years;
    }
  }

  if (leadData.propertyType) {
    validated.propertyType = leadData.propertyType.trim();
  }

  // Financial Information
  if (leadData.mostRecentMortgageDate) {
    const date = new Date(leadData.mostRecentMortgageDate);
    if (isNaN(date.getTime())) {
      errors.push('Most recent mortgage date must be a valid date');
    } else {
      validated.mostRecentMortgageDate = leadData.mostRecentMortgageDate;
    }
  }

  if (leadData.mostRecentMortgageAmount !== undefined && leadData.mostRecentMortgageAmount !== null) {
    const amount = parseFloat(leadData.mostRecentMortgageAmount);
    if (isNaN(amount) || amount < 0) {
      errors.push('Most recent mortgage amount must be a valid positive number');
    } else {
      validated.mostRecentMortgageAmount = amount;
    }
  }

  if (leadData.loanToValue !== undefined && leadData.loanToValue !== null) {
    const ltv = parseFloat(leadData.loanToValue);
    if (isNaN(ltv) || ltv < 0 || ltv > 2) {
      errors.push('Loan to value must be a valid number between 0 and 2');
    } else {
      validated.loanToValue = ltv;
    }
  }

  if (leadData.estimatedIncome !== undefined && leadData.estimatedIncome !== null) {
    const income = parseFloat(leadData.estimatedIncome);
    if (isNaN(income) || income < 0) {
      errors.push('Estimated income must be a valid positive number');
    } else {
      validated.estimatedIncome = income;
    }
  }

  if (leadData.estimatedIncomeCode) {
    validated.estimatedIncomeCode = leadData.estimatedIncomeCode.trim();
  }

  // Personal Demographics
  if (leadData.maritalStatus) {
    validated.maritalStatus = leadData.maritalStatus.trim();
  }

  if (leadData.presenceOfChildren !== undefined && leadData.presenceOfChildren !== null) {
    validated.presenceOfChildren = Boolean(leadData.presenceOfChildren);
  }

  if (leadData.numberOfChildren !== undefined && leadData.numberOfChildren !== null) {
    const children = parseInt(leadData.numberOfChildren);
    if (isNaN(children) || children < 0 || children > 20) {
      errors.push('Number of children must be a valid number between 0 and 20');
    } else {
      validated.numberOfChildren = children;
    }
  }

  if (leadData.education) {
    validated.education = leadData.education.trim();
  }

  if (leadData.occupation) {
    validated.occupation = leadData.occupation.trim();
  }

  if (leadData.language) {
    const lang = leadData.language.trim().toLowerCase();
    // Basic language code validation (2-3 characters)
    if (!/^[a-z]{2,3}$/.test(lang)) {
      errors.push('Language must be a valid language code (e.g., en, es, fr)');
    } else {
      validated.language = lang;
    }
  }

  // Compliance
  if (leadData.dncStatus !== undefined && leadData.dncStatus !== null) {
    validated.dncStatus = Boolean(leadData.dncStatus);
  }

  // Business fields
  if (leadData.company) {
    validated.company = leadData.company.trim();
  }

  if (leadData.industry) {
    validated.industry = leadData.industry.trim();
  }

  if (leadData.source) {
    validated.source = leadData.source.trim();
  }

  if (leadData.notes) {
    validated.notes = leadData.notes.trim();
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    data: validated
  };
}

/**
 * Validate call outcome
 * @param {string} outcome - Call outcome to validate
 * @returns {Object} Validation result
 */
function validateCallOutcome(outcome) {
  const validOutcomes = [
    'INTERESTED',
    'NOT_INTERESTED',
    'CALLBACK_REQUESTED',
    'MEETING_SCHEDULED',
    'SALE_MADE',
    'VOICEMAIL',
    'NO_ANSWER',
    'WRONG_NUMBER'
  ];

  if (!outcome) {
    return { isValid: false, error: 'Call outcome is required' };
  }

  if (!validOutcomes.includes(outcome)) {
    return { 
      isValid: false, 
      error: `Invalid call outcome. Must be one of: ${validOutcomes.join(', ')}` 
    };
  }

  return { isValid: true, outcome: outcome };
}

/**
 * Validate date string
 * @param {string} dateString - Date string to validate
 * @param {string} fieldName - Name of the field for error messages
 * @returns {Object} Validation result
 */
function validateDate(dateString, fieldName = 'date') {
  if (!dateString) {
    return { isValid: true }; // Optional field
  }

  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return { 
      isValid: false, 
      error: `Invalid ${fieldName} format. Use ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)` 
    };
  }

  return { isValid: true, date: date };
}

/**
 * Validate pagination parameters
 * @param {Object} params - Pagination parameters
 * @returns {Object} Validation result
 */
function validatePagination(params) {
  const validated = {
    page: 1,
    limit: 20
  };

  if (params.page) {
    const page = parseInt(params.page);
    if (isNaN(page) || page < 1) {
      return { isValid: false, error: 'Page must be a positive integer' };
    }
    validated.page = page;
  }

  if (params.limit) {
    const limit = parseInt(params.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return { isValid: false, error: 'Limit must be between 1 and 100' };
    }
    validated.limit = limit;
  }

  return { isValid: true, data: validated };
}

/**
 * Validate search parameters
 * @param {Object} params - Search parameters
 * @returns {Object} Validation result
 */
function validateSearchParams(params) {
  const validated = {};
  const errors = [];

  // Date range validation
  if (params.startDate) {
    const startDateValidation = validateDate(params.startDate, 'start date');
    if (!startDateValidation.isValid) {
      errors.push(startDateValidation.error);
    } else {
      validated.startDate = startDateValidation.date;
    }
  }

  if (params.endDate) {
    const endDateValidation = validateDate(params.endDate, 'end date');
    if (!endDateValidation.isValid) {
      errors.push(endDateValidation.error);
    } else {
      validated.endDate = endDateValidation.date;
    }
  }

  // Ensure start date is before end date
  if (validated.startDate && validated.endDate && validated.startDate > validated.endDate) {
    errors.push('Start date must be before end date');
  }

  // Status validation
  if (params.status) {
    const validStatuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST', 'NURTURING'];
    if (!validStatuses.includes(params.status)) {
      errors.push(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    } else {
      validated.status = params.status;
    }
  }

  // Search term validation
  if (params.search) {
    if (typeof params.search !== 'string') {
      errors.push('Search term must be a string');
    } else if (params.search.length < 2) {
      errors.push('Search term must be at least 2 characters long');
    } else {
      validated.search = params.search.trim();
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
    data: validated
  };
}

/**
 * Sanitize text input to prevent XSS
 * @param {string} text - Text to sanitize
 * @returns {string} Sanitized text
 */
function sanitizeText(text) {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return text
    .replace(/[<>]/g, '') // Remove < and > characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Validate API key format
 * @param {string} apiKey - API key to validate
 * @param {string} provider - Provider name (openai, elevenlabs, textmagic)
 * @returns {Object} Validation result
 */
function validateApiKey(apiKey, provider) {
  if (!apiKey || typeof apiKey !== 'string') {
    return { isValid: false, error: `${provider} API key is required` };
  }

  const patterns = {
    openai: /^sk-[a-zA-Z0-9]{48}$/,
    elevenlabs: /^[a-f0-9]{32}$/,
    textmagic: /^[a-zA-Z0-9]{32}$/
  };

  const pattern = patterns[provider.toLowerCase()];
  if (pattern && !pattern.test(apiKey)) {
    return { 
      isValid: false, 
      error: `Invalid ${provider} API key format` 
    };
  }

  return { isValid: true };
}

/**
 * Validate bulk lead data
 * @param {Array} leads - Array of lead data
 * @returns {Object} Validation result
 */
function validateBulkLeads(leads) {
  if (!Array.isArray(leads)) {
    return { isValid: false, error: 'Leads must be an array' };
  }

  if (leads.length === 0) {
    return { isValid: false, error: 'At least one lead is required' };
  }

  if (leads.length > 1000) {
    return { isValid: false, error: 'Maximum 1000 leads allowed per bulk import' };
  }

  const results = {
    valid: [],
    invalid: []
  };

  leads.forEach((lead, index) => {
    const validation = validateLeadData(lead);
    if (validation.isValid) {
      results.valid.push({ index, data: validation.data });
    } else {
      results.invalid.push({ index, errors: validation.errors });
    }
  });

  return {
    isValid: results.invalid.length === 0,
    results: results,
    summary: {
      total: leads.length,
      valid: results.valid.length,
      invalid: results.invalid.length
    }
  };
}

module.exports = {
  validatePhoneNumber,
  validateEmail,
  validateLeadData,
  validateCallOutcome,
  validateDate,
  validatePagination,
  validateSearchParams,
  sanitizeText,
  validateApiKey,
  validateBulkLeads
};
