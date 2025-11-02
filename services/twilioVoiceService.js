const twilio = require('twilio');
const { DebugLogger } = require('../utils/logger');

class TwilioVoiceService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    
    if (!this.accountSid || !this.authToken) {
      throw new Error('Twilio credentials not found in environment variables');
    }
    
    this.client = twilio(this.accountSid, this.authToken);
  }

  /**
   * Initiate an outbound voice call
   * @param {string} toNumber - Customer phone number
   * @param {string} callId - Unique call identifier
   * @param {Object} leadData - Lead information for personalization
   */
  async initiateCall(toNumber, callId, leadData) {
    try {
      DebugLogger.logSuccess('Initiating Twilio voice call', {
        callId,
        toNumber: this.maskPhoneNumber(toNumber),
        leadName: `${leadData.firstName} ${leadData.lastName}`
      });

      const call = await this.client.calls.create({
        to: toNumber,
        from: this.phoneNumber,
        url: `${process.env.BASE_URL}/api/realtime-voice/stream/${callId}`, // Use realtime stream
        method: 'POST',
        record: true, // Record the call for analysis
        recordingStatusCallback: `${process.env.BASE_URL}/api/voice/recording/${callId}`,
        statusCallback: `${process.env.BASE_URL}/api/voice/status/${callId}`,
        statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
        timeout: 30, // Ring for 30 seconds
        machineDetection: 'Enable', // Detect voicemail
        machineDetectionTimeout: 5
      });

      DebugLogger.logSuccess('Twilio call initiated', {
        callId,
        twilioCallSid: call.sid,
        status: call.status
      });

      return {
        success: true,
        twilioCallSid: call.sid,
        status: call.status,
        callId: callId
      };

    } catch (error) {
      DebugLogger.logCallError(callId, error, 'twilio_initiation');
      throw error;
    }
  }

  /**
   * Get call details from Twilio
   * @param {string} twilioCallSid - Twilio call SID
   */
  async getCallDetails(twilioCallSid) {
    try {
      const call = await this.client.calls(twilioCallSid).fetch();
      
      return {
        status: call.status,
        duration: call.duration,
        startTime: call.startTime,
        endTime: call.endTime,
        direction: call.direction,
        answeredBy: call.answeredBy,
        price: call.price,
        priceUnit: call.priceUnit
      };
    } catch (error) {
      DebugLogger.logTwilioError(error, 'get_call_details', twilioCallSid);
      throw error;
    }
  }

  /**
   * Get call recording URL
   * @param {string} twilioCallSid - Twilio call SID
   */
  async getRecordingUrl(twilioCallSid) {
    try {
      const recordings = await this.client.recordings.list({
        callSid: twilioCallSid,
        limit: 1
      });

      if (recordings.length > 0) {
        const recording = recordings[0];
        return {
          recordingUrl: `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`,
          duration: recording.duration,
          recordingSid: recording.sid
        };
      }

      return null;
    } catch (error) {
      DebugLogger.logTwilioError(error, 'get_recording', twilioCallSid);
      return null;
    }
  }

  /**
   * Purchase a phone number for calling
   * @param {string} areaCode - Preferred area code
   */
  async purchasePhoneNumber(areaCode = '415') {
    try {
      // Search for available numbers
      const numbers = await this.client.availablePhoneNumbers('US')
        .local
        .list({
          areaCode: areaCode,
          voiceEnabled: true,
          limit: 1
        });

      if (numbers.length === 0) {
        throw new Error(`No available phone numbers in area code ${areaCode}`);
      }

      // Purchase the first available number
      const phoneNumber = await this.client.incomingPhoneNumbers.create({
        phoneNumber: numbers[0].phoneNumber,
        voiceUrl: `${process.env.BASE_URL}/api/voice/incoming`,
        voiceMethod: 'POST'
      });

      DebugLogger.logSuccess('Phone number purchased', {
        phoneNumber: phoneNumber.phoneNumber,
        friendlyName: phoneNumber.friendlyName
      });

      return {
        phoneNumber: phoneNumber.phoneNumber,
        friendlyName: phoneNumber.friendlyName,
        sid: phoneNumber.sid
      };

    } catch (error) {
      DebugLogger.logTwilioError(error, 'purchase_phone_number', areaCode);
      throw error;
    }
  }

  /**
   * List purchased phone numbers
   */
  async listPhoneNumbers() {
    try {
      const numbers = await this.client.incomingPhoneNumbers.list();
      
      return numbers.map(number => ({
        phoneNumber: number.phoneNumber,
        friendlyName: number.friendlyName,
        sid: number.sid,
        voiceEnabled: number.capabilities.voice,
        smsEnabled: number.capabilities.sms
      }));
    } catch (error) {
      DebugLogger.logTwilioError(error, 'list_phone_numbers');
      throw error;
    }
  }

  /**
   * Mask phone number for logging (privacy)
   * @param {string} phoneNumber - Phone number to mask
   */
  maskPhoneNumber(phoneNumber) {
    if (!phoneNumber || phoneNumber.length < 4) return phoneNumber;
    return phoneNumber.slice(0, -4) + '****';
  }

  /**
   * Validate phone number format
   * @param {string} phoneNumber - Phone number to validate
   */
  validatePhoneNumber(phoneNumber) {
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    const phoneRegex = /^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$/;
    return phoneRegex.test(cleaned);
  }
}

module.exports = TwilioVoiceService;
