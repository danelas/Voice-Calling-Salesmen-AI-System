const TextMagic = require('textmagic-rest-nodejs');

class TextMagicService {
  constructor() {
    this.client = new TextMagic.TextMagicApi({
      username: process.env.TEXTMAGIC_USERNAME,
      token: process.env.TEXTMAGIC_API_KEY
    });
  }

  /**
   * Initiate a voice call to a phone number
   * @param {string} phoneNumber - Phone number to call
   * @param {string} message - Message to speak (will be converted to speech)
   * @param {Object} options - Additional call options
   * @returns {Promise<Object>} Call initiation result
   */
  async initiateCall(phoneNumber, message, options = {}) {
    try {
      // TextMagic primarily handles SMS, but we can use it for call notifications
      // For actual voice calls, you might need to integrate with Twilio or similar
      
      const callData = {
        phones: phoneNumber,
        text: `Voice call initiated: ${message}`,
        ...options
      };

      // This is a placeholder - TextMagic doesn't directly support voice calls
      // You would typically use Twilio Voice API for actual calling
      console.log('Call would be initiated with:', callData);
      
      // Simulate call initiation
      return {
        success: true,
        callId: `call_${Date.now()}`,
        phoneNumber: phoneNumber,
        status: 'initiated',
        message: 'Call simulation - integrate with Twilio for real calls'
      };
      
    } catch (error) {
      console.error('TextMagic Call Error:', error);
      throw new Error(`Failed to initiate call: ${error.message}`);
    }
  }

  /**
   * Send SMS notification about call
   * @param {string} phoneNumber - Phone number to send SMS to
   * @param {string} message - SMS message content
   * @returns {Promise<Object>} SMS send result
   */
  async sendSMS(phoneNumber, message) {
    try {
      const result = await this.client.messages.create({
        phones: phoneNumber,
        text: message
      });

      return {
        success: true,
        messageId: result.id,
        phoneNumber: phoneNumber,
        status: 'sent',
        message: message
      };
    } catch (error) {
      console.error('TextMagic SMS Error:', error);
      throw new Error(`Failed to send SMS: ${error.message}`);
    }
  }

  /**
   * Send follow-up SMS after a call
   * @param {string} phoneNumber - Phone number
   * @param {string} callOutcome - Outcome of the call
   * @param {string} nextSteps - Next steps discussed
   * @returns {Promise<Object>} SMS result
   */
  async sendFollowUpSMS(phoneNumber, callOutcome, nextSteps) {
    try {
      let message = '';
      
      switch (callOutcome) {
        case 'INTERESTED':
          message = `Thank you for your time today! As discussed, ${nextSteps}. I'll follow up soon with more details.`;
          break;
        case 'MEETING_SCHEDULED':
          message = `Great speaking with you! Looking forward to our meeting. ${nextSteps}`;
          break;
        case 'CALLBACK_REQUESTED':
          message = `Thanks for your time. I'll call you back as requested. ${nextSteps}`;
          break;
        case 'NOT_INTERESTED':
          message = `Thank you for your time today. If anything changes, please don't hesitate to reach out.`;
          break;
        default:
          message = `Thank you for your time today. ${nextSteps || 'I\'ll follow up as discussed.'}`;
      }

      return await this.sendSMS(phoneNumber, message);
    } catch (error) {
      console.error('Follow-up SMS Error:', error);
      throw new Error(`Failed to send follow-up SMS: ${error.message}`);
    }
  }

  /**
   * Get SMS delivery status
   * @param {string} messageId - Message ID from TextMagic
   * @returns {Promise<Object>} Delivery status
   */
  async getSMSStatus(messageId) {
    try {
      const status = await this.client.messages.get(messageId);
      
      return {
        messageId: messageId,
        status: status.status,
        deliveredAt: status.deliveredAt,
        errorMessage: status.errorMessage
      };
    } catch (error) {
      console.error('SMS Status Error:', error);
      throw new Error(`Failed to get SMS status: ${error.message}`);
    }
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number to validate
   * @returns {boolean} Whether phone number is valid
   */
  validatePhoneNumber(phoneNumber) {
    // Basic phone number validation
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Format phone number for TextMagic
   * @param {string} phoneNumber - Raw phone number
   * @returns {string} Formatted phone number
   */
  formatPhoneNumber(phoneNumber) {
    // Remove all non-digit characters except +
    let formatted = phoneNumber.replace(/[^\d+]/g, '');
    
    // Add + if not present and number doesn't start with it
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    
    return formatted;
  }

  /**
   * Send appointment reminder SMS
   * @param {string} phoneNumber - Phone number
   * @param {Date} appointmentDate - Appointment date/time
   * @param {string} details - Appointment details
   * @returns {Promise<Object>} SMS result
   */
  async sendAppointmentReminder(phoneNumber, appointmentDate, details) {
    try {
      const formattedDate = appointmentDate.toLocaleDateString();
      const formattedTime = appointmentDate.toLocaleTimeString();
      
      const message = `Reminder: You have an appointment scheduled for ${formattedDate} at ${formattedTime}. ${details}`;
      
      return await this.sendSMS(phoneNumber, message);
    } catch (error) {
      console.error('Appointment Reminder Error:', error);
      throw new Error(`Failed to send appointment reminder: ${error.message}`);
    }
  }

  /**
   * Send bulk SMS to multiple leads
   * @param {Array} phoneNumbers - Array of phone numbers
   * @param {string} message - Message to send
   * @returns {Promise<Array>} Array of results
   */
  async sendBulkSMS(phoneNumbers, message) {
    try {
      const results = [];
      
      for (const phoneNumber of phoneNumbers) {
        try {
          const result = await this.sendSMS(phoneNumber, message);
          results.push(result);
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          results.push({
            success: false,
            phoneNumber: phoneNumber,
            error: error.message
          });
        }
      }
      
      return results;
    } catch (error) {
      console.error('Bulk SMS Error:', error);
      throw new Error(`Failed to send bulk SMS: ${error.message}`);
    }
  }
}

module.exports = TextMagicService;
