const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/analytics/overview
 * Get overall analytics overview
 */
router.get('/overview', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    const [
      totalCalls,
      completedCalls,
      successfulCalls,
      averageCallDuration,
      callOutcomes,
      callsByDay,
      topPerformingScripts,
      conversionMetrics
    ] = await Promise.all([
      // Total calls
      prisma.call.count({ where: dateFilter }),
      
      // Completed calls
      prisma.call.count({ 
        where: { ...dateFilter, status: 'COMPLETED' } 
      }),
      
      // Successful calls (interested, meeting scheduled, sale made)
      prisma.call.count({
        where: {
          ...dateFilter,
          outcome: {
            in: ['INTERESTED', 'MEETING_SCHEDULED', 'SALE_MADE']
          }
        }
      }),
      
      // Average call duration
      prisma.call.aggregate({
        where: { ...dateFilter, duration: { not: null } },
        _avg: { duration: true }
      }),
      
      // Call outcomes breakdown
      prisma.call.groupBy({
        by: ['outcome'],
        _count: { outcome: true },
        where: { ...dateFilter, outcome: { not: null } }
      }),
      
      // Calls by day (last 30 days)
      prisma.$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM calls 
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `,
      
      // Top performing scripts (placeholder - would need script tracking)
      Promise.resolve([]),
      
      // Conversion metrics from analytics
      prisma.callAnalytics.aggregate({
        where: {
          call: dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : undefined
        },
        _avg: {
          engagementScore: true,
          conversionProbability: true
        }
      })
    ]);

    const successRate = completedCalls > 0 ? (successfulCalls / completedCalls) * 100 : 0;
    const completionRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;

    res.json({
      success: true,
      analytics: {
        overview: {
          totalCalls,
          completedCalls,
          successfulCalls,
          successRate: Math.round(successRate * 100) / 100,
          completionRate: Math.round(completionRate * 100) / 100,
          averageCallDuration: Math.round(averageCallDuration._avg.duration || 0),
          averageEngagementScore: Math.round((conversionMetrics._avg.engagementScore || 0) * 100) / 100,
          averageConversionProbability: Math.round((conversionMetrics._avg.conversionProbability || 0) * 100) / 100
        },
        callOutcomes: callOutcomes.map(outcome => ({
          outcome: outcome.outcome,
          count: outcome._count.outcome,
          percentage: completedCalls > 0 ? Math.round((outcome._count.outcome / completedCalls) * 10000) / 100 : 0
        })),
        callsByDay: callsByDay.map(day => ({
          date: day.date,
          count: parseInt(day.count)
        })),
        topPerformingScripts: topPerformingScripts
      }
    });

  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics overview',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/performance
 * Get detailed performance analytics
 */
router.get('/performance', async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.lte = new Date(endDate);
    }

    // Get detailed call analytics
    const callAnalytics = await prisma.callAnalytics.findMany({
      where: {
        call: dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : undefined
      },
      include: {
        call: {
          select: {
            id: true,
            outcome: true,
            duration: true,
            createdAt: true,
            lead: {
              select: {
                industry: true,
                company: true
              }
            }
          }
        }
      }
    });

    // Calculate performance metrics
    const performanceMetrics = {
      averageTalkTime: 0,
      averageListenTime: 0,
      averageInterruptions: 0,
      averageQuestions: 0,
      averageObjections: 0,
      sentimentDistribution: { positive: 0, neutral: 0, negative: 0 },
      industryPerformance: {},
      improvementSuggestions: {}
    };

    if (callAnalytics.length > 0) {
      // Calculate averages
      performanceMetrics.averageTalkTime = Math.round(
        callAnalytics.reduce((sum, analytics) => sum + analytics.talkTime, 0) / callAnalytics.length
      );
      
      performanceMetrics.averageListenTime = Math.round(
        callAnalytics.reduce((sum, analytics) => sum + analytics.listenTime, 0) / callAnalytics.length
      );
      
      performanceMetrics.averageInterruptions = Math.round(
        callAnalytics.reduce((sum, analytics) => sum + analytics.interruptionCount, 0) / callAnalytics.length * 100
      ) / 100;
      
      performanceMetrics.averageQuestions = Math.round(
        callAnalytics.reduce((sum, analytics) => sum + analytics.questionCount, 0) / callAnalytics.length * 100
      ) / 100;
      
      performanceMetrics.averageObjections = Math.round(
        callAnalytics.reduce((sum, analytics) => sum + analytics.objectionCount, 0) / callAnalytics.length * 100
      ) / 100;

      // Sentiment distribution
      const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
      callAnalytics.forEach(analytics => {
        if (analytics.emotionalTone) {
          sentimentCounts[analytics.emotionalTone.toLowerCase()] = 
            (sentimentCounts[analytics.emotionalTone.toLowerCase()] || 0) + 1;
        }
      });
      
      const totalSentiments = Object.values(sentimentCounts).reduce((sum, count) => sum + count, 0);
      if (totalSentiments > 0) {
        performanceMetrics.sentimentDistribution = {
          positive: Math.round((sentimentCounts.positive / totalSentiments) * 10000) / 100,
          neutral: Math.round((sentimentCounts.neutral / totalSentiments) * 10000) / 100,
          negative: Math.round((sentimentCounts.negative / totalSentiments) * 10000) / 100
        };
      }

      // Industry performance
      const industryStats = {};
      callAnalytics.forEach(analytics => {
        const industry = analytics.call.lead.industry || 'Unknown';
        if (!industryStats[industry]) {
          industryStats[industry] = {
            totalCalls: 0,
            totalConversionProbability: 0,
            totalEngagementScore: 0,
            successfulCalls: 0
          };
        }
        
        industryStats[industry].totalCalls++;
        industryStats[industry].totalConversionProbability += analytics.conversionProbability || 0;
        industryStats[industry].totalEngagementScore += analytics.engagementScore || 0;
        
        if (['INTERESTED', 'MEETING_SCHEDULED', 'SALE_MADE'].includes(analytics.call.outcome)) {
          industryStats[industry].successfulCalls++;
        }
      });

      performanceMetrics.industryPerformance = Object.entries(industryStats).map(([industry, stats]) => ({
        industry,
        totalCalls: stats.totalCalls,
        successRate: Math.round((stats.successfulCalls / stats.totalCalls) * 10000) / 100,
        averageConversionProbability: Math.round((stats.totalConversionProbability / stats.totalCalls) * 10000) / 100,
        averageEngagementScore: Math.round((stats.totalEngagementScore / stats.totalCalls) * 10000) / 100
      }));

      // Aggregate improvement suggestions
      const suggestionCounts = {};
      callAnalytics.forEach(analytics => {
        analytics.improvementSuggestions.forEach(suggestion => {
          suggestionCounts[suggestion] = (suggestionCounts[suggestion] || 0) + 1;
        });
      });

      performanceMetrics.improvementSuggestions = Object.entries(suggestionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([suggestion, count]) => ({
          suggestion,
          frequency: count,
          percentage: Math.round((count / callAnalytics.length) * 10000) / 100
        }));
    }

    res.json({
      success: true,
      performance: performanceMetrics,
      totalAnalyzedCalls: callAnalytics.length
    });

  } catch (error) {
    console.error('Performance analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch performance analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/trends
 * Get trend analysis over time
 */
router.get('/trends', async (req, res) => {
  try {
    const { period = '30d', metric = 'success_rate' } = req.query;
    
    let dateRange;
    let groupByFormat;
    
    switch (period) {
      case '7d':
        dateRange = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        groupByFormat = 'day';
        break;
      case '30d':
        dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        groupByFormat = 'day';
        break;
      case '90d':
        dateRange = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        groupByFormat = 'week';
        break;
      case '1y':
        dateRange = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        groupByFormat = 'month';
        break;
      default:
        dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        groupByFormat = 'day';
    }

    // Get calls data for trend analysis
    const calls = await prisma.call.findMany({
      where: {
        createdAt: { gte: dateRange }
      },
      select: {
        id: true,
        status: true,
        outcome: true,
        duration: true,
        createdAt: true
      }
    });

    // Get analytics data
    const analytics = await prisma.callAnalytics.findMany({
      where: {
        call: {
          createdAt: { gte: dateRange }
        }
      },
      select: {
        engagementScore: true,
        conversionProbability: true,
        call: {
          select: {
            createdAt: true
          }
        }
      }
    });

    // Group data by time period
    const trendData = {};
    
    calls.forEach(call => {
      const dateKey = formatDateForGrouping(call.createdAt, groupByFormat);
      
      if (!trendData[dateKey]) {
        trendData[dateKey] = {
          date: dateKey,
          totalCalls: 0,
          completedCalls: 0,
          successfulCalls: 0,
          totalDuration: 0,
          engagementScores: [],
          conversionProbabilities: []
        };
      }
      
      trendData[dateKey].totalCalls++;
      
      if (call.status === 'COMPLETED') {
        trendData[dateKey].completedCalls++;
        if (call.duration) {
          trendData[dateKey].totalDuration += call.duration;
        }
        
        if (['INTERESTED', 'MEETING_SCHEDULED', 'SALE_MADE'].includes(call.outcome)) {
          trendData[dateKey].successfulCalls++;
        }
      }
    });

    analytics.forEach(analytic => {
      const dateKey = formatDateForGrouping(analytic.call.createdAt, groupByFormat);
      
      if (trendData[dateKey]) {
        if (analytic.engagementScore) {
          trendData[dateKey].engagementScores.push(analytic.engagementScore);
        }
        if (analytic.conversionProbability) {
          trendData[dateKey].conversionProbabilities.push(analytic.conversionProbability);
        }
      }
    });

    // Calculate metrics for each time period
    const trends = Object.values(trendData).map(data => {
      const successRate = data.completedCalls > 0 ? 
        (data.successfulCalls / data.completedCalls) * 100 : 0;
      
      const averageDuration = data.completedCalls > 0 ? 
        data.totalDuration / data.completedCalls : 0;
      
      const averageEngagement = data.engagementScores.length > 0 ?
        data.engagementScores.reduce((sum, score) => sum + score, 0) / data.engagementScores.length : 0;
      
      const averageConversion = data.conversionProbabilities.length > 0 ?
        data.conversionProbabilities.reduce((sum, prob) => sum + prob, 0) / data.conversionProbabilities.length : 0;

      return {
        date: data.date,
        totalCalls: data.totalCalls,
        completedCalls: data.completedCalls,
        successfulCalls: data.successfulCalls,
        successRate: Math.round(successRate * 100) / 100,
        averageDuration: Math.round(averageDuration),
        averageEngagement: Math.round(averageEngagement * 100) / 100,
        averageConversion: Math.round(averageConversion * 100) / 100
      };
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    res.json({
      success: true,
      trends: trends,
      period: period,
      metric: metric,
      totalDataPoints: trends.length
    });

  } catch (error) {
    console.error('Trends analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch trend analytics',
      message: error.message
    });
  }
});

/**
 * GET /api/analytics/improvements
 * Get improvement recommendations based on call analysis
 */
router.get('/improvements', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get recent call analytics for improvement analysis
    const recentAnalytics = await prisma.callAnalytics.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      include: {
        call: {
          select: {
            outcome: true,
            duration: true,
            lead: {
              select: {
                industry: true
              }
            }
          }
        }
      }
    });

    // Analyze patterns and generate recommendations
    const improvements = [];

    if (recentAnalytics.length > 0) {
      // Analyze talk time ratio
      const averageTalkTime = recentAnalytics.reduce((sum, a) => sum + a.talkTime, 0) / recentAnalytics.length;
      const averageListenTime = recentAnalytics.reduce((sum, a) => sum + a.listenTime, 0) / recentAnalytics.length;
      const talkRatio = averageTalkTime / (averageTalkTime + averageListenTime);

      if (talkRatio > 0.7) {
        improvements.push({
          category: 'Communication',
          priority: 'High',
          title: 'Reduce Talk Time',
          description: 'AI is talking too much. Focus on asking questions and listening to customer needs.',
          impact: 'High',
          frequency: Math.round(talkRatio * 100),
          recommendation: 'Implement more discovery questions and active listening techniques.'
        });
      }

      // Analyze interruption patterns
      const averageInterruptions = recentAnalytics.reduce((sum, a) => sum + a.interruptionCount, 0) / recentAnalytics.length;
      if (averageInterruptions > 2) {
        improvements.push({
          category: 'Conversation Flow',
          priority: 'Medium',
          title: 'Reduce Interruptions',
          description: 'High interruption rate may indicate poor conversation timing.',
          impact: 'Medium',
          frequency: Math.round(averageInterruptions * 10),
          recommendation: 'Add natural pauses and wait for customer responses before continuing.'
        });
      }

      // Analyze objection handling
      const callsWithObjections = recentAnalytics.filter(a => a.objectionCount > 0);
      const successfulObjectionHandling = callsWithObjections.filter(a => 
        ['INTERESTED', 'MEETING_SCHEDULED', 'SALE_MADE'].includes(a.call.outcome)
      );

      if (callsWithObjections.length > 0) {
        const objectionSuccessRate = successfulObjectionHandling.length / callsWithObjections.length;
        if (objectionSuccessRate < 0.3) {
          improvements.push({
            category: 'Objection Handling',
            priority: 'High',
            title: 'Improve Objection Responses',
            description: 'Low success rate when handling customer objections.',
            impact: 'High',
            frequency: callsWithObjections.length,
            recommendation: 'Develop better objection handling scripts and empathy responses.'
          });
        }
      }

      // Analyze engagement scores
      const lowEngagementCalls = recentAnalytics.filter(a => a.engagementScore < 0.4);
      if (lowEngagementCalls.length > recentAnalytics.length * 0.3) {
        improvements.push({
          category: 'Engagement',
          priority: 'High',
          title: 'Increase Customer Engagement',
          description: 'Many calls show low customer engagement scores.',
          impact: 'High',
          frequency: lowEngagementCalls.length,
          recommendation: 'Use more personalized openers and relevant value propositions.'
        });
      }

      // Analyze industry-specific patterns
      const industryPerformance = {};
      recentAnalytics.forEach(analytics => {
        const industry = analytics.call.lead.industry || 'Unknown';
        if (!industryPerformance[industry]) {
          industryPerformance[industry] = { total: 0, successful: 0 };
        }
        industryPerformance[industry].total++;
        if (['INTERESTED', 'MEETING_SCHEDULED', 'SALE_MADE'].includes(analytics.call.outcome)) {
          industryPerformance[industry].successful++;
        }
      });

      Object.entries(industryPerformance).forEach(([industry, stats]) => {
        if (stats.total >= 5) { // Only analyze industries with sufficient data
          const successRate = stats.successful / stats.total;
          if (successRate < 0.2) {
            improvements.push({
              category: 'Industry Targeting',
              priority: 'Medium',
              title: `Improve ${industry} Approach`,
              description: `Low success rate in ${industry} industry calls.`,
              impact: 'Medium',
              frequency: stats.total,
              recommendation: `Develop industry-specific scripts and value propositions for ${industry}.`
            });
          }
        }
      });

      // Aggregate improvement suggestions from call analytics
      const suggestionCounts = {};
      recentAnalytics.forEach(analytics => {
        analytics.improvementSuggestions.forEach(suggestion => {
          suggestionCounts[suggestion] = (suggestionCounts[suggestion] || 0) + 1;
        });
      });

      Object.entries(suggestionCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .forEach(([suggestion, count]) => {
          improvements.push({
            category: 'AI Generated',
            priority: count > recentAnalytics.length * 0.3 ? 'High' : 'Medium',
            title: suggestion,
            description: 'AI-generated improvement suggestion based on call analysis.',
            impact: count > recentAnalytics.length * 0.3 ? 'High' : 'Medium',
            frequency: count,
            recommendation: suggestion
          });
        });
    }

    // Sort by priority and frequency
    improvements.sort((a, b) => {
      const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.frequency - a.frequency;
    });

    res.json({
      success: true,
      improvements: improvements.slice(0, parseInt(limit)),
      totalAnalyzedCalls: recentAnalytics.length,
      analysisDate: new Date().toISOString()
    });

  } catch (error) {
    console.error('Improvements analytics error:', error);
    res.status(500).json({
      error: 'Failed to fetch improvement recommendations',
      message: error.message
    });
  }
});

/**
 * Helper function to format dates for grouping
 */
function formatDateForGrouping(date, groupBy) {
  const d = new Date(date);
  
  switch (groupBy) {
    case 'day':
      return d.toISOString().split('T')[0];
    case 'week':
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      return weekStart.toISOString().split('T')[0];
    case 'month':
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    default:
      return d.toISOString().split('T')[0];
  }
}

module.exports = router;
