const { DebugLogger } = require('../utils/logger');

class NotificationService {
  constructor() {
    this.webhookUrl = process.env.SLACK_WEBHOOK_URL || null;
    this.emailEnabled = process.env.EMAIL_NOTIFICATIONS === 'true';
    this.smsEnabled = process.env.SMS_NOTIFICATIONS === 'true';
  }

  /**
   * Send notification when a lead shows interest
   * @param {Object} callOutcome - Analysis results from OpenAI
   * @param {Object} callData - Call information
   */
  async sendInterestNotification(callOutcome, callData) {
    try {
      const isHighPriority = callOutcome.outcome === 'APPOINTMENT_SET' || 
                            callOutcome.outcome === 'INTERESTED' || 
                            callOutcome.interestLevel >= 7;

      if (!isHighPriority && !callOutcome.notificationRequired) {
        return; // No notification needed
      }

      const notification = this.buildNotificationMessage(callOutcome, callData);
      
      // Send to multiple channels
      const promises = [];
      
      if (this.webhookUrl) {
        promises.push(this.sendSlackNotification(notification));
      }
      
      if (this.emailEnabled) {
        promises.push(this.sendEmailNotification(notification));
      }
      
      if (this.smsEnabled && isHighPriority) {
        promises.push(this.sendSMSNotification(notification));
      }

      // Always log to console/dashboard
      promises.push(this.logNotification(notification));

      await Promise.allSettled(promises);
      
      DebugLogger.logSuccess('Interest notification sent', {
        leadId: callOutcome.leadId,
        outcome: callOutcome.outcome,
        interestLevel: callOutcome.interestLevel
      });

    } catch (error) {
      DebugLogger.logSystemError(error, 'send_interest_notification', {
        leadId: callOutcome.leadId
      });
    }
  }

  /**
   * Build notification message
   */
  buildNotificationMessage(callOutcome, callData) {
    const urgencyEmoji = this.getUrgencyEmoji(callOutcome);
    const priorityText = callOutcome.priority === 'HIGH' ? '🔥 HIGH PRIORITY' : callOutcome.priority;
    
    return {
      title: `${urgencyEmoji} New ${callOutcome.outcome.replace('_', ' ')} Lead!`,
      priority: callOutcome.priority,
      lead: {
        name: callOutcome.leadName,
        phone: callOutcome.leadPhone,
        interestLevel: callOutcome.interestLevel
      },
      outcome: callOutcome.outcome,
      summary: callOutcome.summary,
      nextSteps: callOutcome.nextSteps,
      appointmentDetails: callOutcome.appointmentDetails,
      followUpTiming: callOutcome.followUpTiming,
      timestamp: new Date().toISOString(),
      callDuration: callData.duration || 'Unknown',
      dashboardUrl: `${process.env.DASHBOARD_URL || 'https://voice-calling-salesmen-ai-system.onrender.com'}/conversations/${callData.id}`
    };
  }

  /**
   * Get urgency emoji based on outcome
   */
  getUrgencyEmoji(callOutcome) {
    switch (callOutcome.outcome) {
      case 'APPOINTMENT_SET': return '📅';
      case 'INTERESTED': return '✨';
      case 'CALLBACK_REQUESTED': return '📞';
      default: return '📋';
    }
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(notification) {
    if (!this.webhookUrl) return;

    try {
      const axios = require('axios');
      
      const slackMessage = {
        text: notification.title,
        attachments: [
          {
            color: notification.priority === 'HIGH' ? 'danger' : 'good',
            fields: [
              {
                title: 'Lead Information',
                value: `*Name:* ${notification.lead.name}\n*Phone:* ${notification.lead.phone}\n*Interest Level:* ${notification.lead.interestLevel}/10`,
                short: true
              },
              {
                title: 'Call Outcome',
                value: `*Result:* ${notification.outcome}\n*Duration:* ${notification.callDuration}\n*Priority:* ${notification.priority}`,
                short: true
              },
              {
                title: 'Summary',
                value: notification.summary,
                short: false
              },
              {
                title: 'Next Steps',
                value: notification.nextSteps.map(step => `• ${step}`).join('\n'),
                short: false
              }
            ],
            actions: [
              {
                type: 'button',
                text: 'View in Dashboard',
                url: notification.dashboardUrl
              }
            ],
            footer: 'Levco Real Estate AI',
            ts: Math.floor(Date.now() / 1000)
          }
        ]
      };

      if (notification.appointmentDetails && notification.appointmentDetails.date) {
        slackMessage.attachments[0].fields.push({
          title: 'Appointment Scheduled',
          value: `*Date:* ${notification.appointmentDetails.date}\n*Time:* ${notification.appointmentDetails.time}\n*Notes:* ${notification.appointmentDetails.notes || 'None'}`,
          short: false
        });
      }

      await axios.post(this.webhookUrl, slackMessage);
      
    } catch (error) {
      console.error('Slack notification failed:', error);
    }
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(notification) {
    // Placeholder for email integration
    // You can integrate with SendGrid, AWS SES, etc.
    console.log('📧 Email notification would be sent:', {
      to: process.env.NOTIFICATION_EMAIL,
      subject: notification.title,
      body: notification.summary
    });
  }

  /**
   * Send SMS notification for high priority leads
   */
  async sendSMSNotification(notification) {
    // Placeholder for SMS integration
    // You can integrate with Twilio SMS, etc.
    console.log('📱 SMS notification would be sent:', {
      to: process.env.NOTIFICATION_PHONE,
      message: `${notification.title}: ${notification.lead.name} (${notification.lead.phone}) - Interest Level: ${notification.lead.interestLevel}/10`
    });
  }

  /**
   * Log notification to system
   */
  async logNotification(notification) {
    DebugLogger.logSuccess('Lead Interest Notification', {
      type: 'LEAD_INTEREST',
      leadName: notification.lead.name,
      leadPhone: notification.lead.phone,
      outcome: notification.outcome,
      interestLevel: notification.lead.interestLevel,
      priority: notification.priority,
      appointmentScheduled: !!notification.appointmentDetails?.date,
      nextSteps: notification.nextSteps.length,
      timestamp: notification.timestamp
    });

    // Also create a dashboard alert record
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      await prisma.notification.create({
        data: {
          type: 'LEAD_INTEREST',
          title: notification.title,
          message: notification.summary,
          priority: notification.priority,
          leadName: notification.lead.name,
          leadPhone: notification.lead.phone,
          outcome: notification.outcome,
          interestLevel: notification.lead.interestLevel,
          read: false,
          createdAt: new Date()
        }
      });
    } catch (dbError) {
      console.error('Failed to save notification to database:', dbError);
    }
  }

  /**
   * Get recent notifications for dashboard
   */
  async getRecentNotifications(limit = 10) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      return await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      return [];
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId) {
    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      await prisma.notification.update({
        where: { id: notificationId },
        data: { read: true }
      });
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }
}

module.exports = NotificationService;
