const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * GET /api/dashboard
 * Get comprehensive dashboard data
 */
router.get('/', async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    // Calculate date range based on timeframe
    let startDate;
    switch (timeframe) {
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const dateFilter = { createdAt: { gte: startDate } };

    // Fetch all dashboard data in parallel
    const [
      // Call metrics
      totalCalls,
      completedCalls,
      inProgressCalls,
      scheduledCalls,
      
      // Success metrics
      successfulCalls,
      callOutcomes,
      
      // Lead metrics
      totalLeads,
      newLeads,
      qualifiedLeads,
      
      // Performance metrics
      averageCallDuration,
      callAnalytics,
      
      // Recent activity
      recentCalls,
      recentLeads,
      
      // Trends data
      dailyCallStats,
      
      // Top performers
      topIndustries,
      topSources
    ] = await Promise.all([
      // Call counts
      prisma.call.count({ where: dateFilter }),
      prisma.call.count({ where: { ...dateFilter, status: 'COMPLETED' } }),
      prisma.call.count({ where: { ...dateFilter, status: 'IN_PROGRESS' } }),
      prisma.call.count({ where: { ...dateFilter, status: 'SCHEDULED' } }),
      
      // Success metrics
      prisma.call.count({
        where: {
          ...dateFilter,
          outcome: { in: ['INTERESTED', 'MEETING_SCHEDULED', 'SALE_MADE'] }
        }
      }),
      prisma.call.groupBy({
        by: ['outcome'],
        _count: { outcome: true },
        where: { ...dateFilter, outcome: { not: null } }
      }),
      
      // Lead metrics
      prisma.lead.count({ where: dateFilter }),
      prisma.lead.count({ where: { ...dateFilter, status: 'NEW' } }),
      prisma.lead.count({ where: { ...dateFilter, status: 'QUALIFIED' } }),
      
      // Performance
      prisma.call.aggregate({
        where: { ...dateFilter, duration: { not: null } },
        _avg: { duration: true }
      }),
      prisma.callAnalytics.aggregate({
        where: {
          call: { createdAt: { gte: startDate } }
        },
        _avg: {
          engagementScore: true,
          conversionProbability: true
        }
      }),
      
      // Recent activity
      prisma.call.findMany({
        where: dateFilter,
        include: {
          lead: {
            select: {
              firstName: true,
              lastName: true,
              company: true,
              phone: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      prisma.lead.findMany({
        where: dateFilter,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          status: true,
          createdAt: true,
          _count: { select: { calls: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      
      // Daily trends (last 30 days)
      prisma.$queryRaw`
        SELECT 
          DATE("createdAt") as date,
          COUNT(*) as total_calls,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_calls,
          COUNT(CASE WHEN outcome IN ('INTERESTED', 'MEETING_SCHEDULED', 'SALE_MADE') THEN 1 END) as successful_calls
        FROM calls 
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date DESC
        LIMIT 30
      `,
      
      // Top performing industries
      prisma.lead.groupBy({
        by: ['industry'],
        _count: { industry: true },
        where: {
          ...dateFilter,
          industry: { not: null },
          calls: {
            some: {
              outcome: { in: ['INTERESTED', 'MEETING_SCHEDULED', 'SALE_MADE'] }
            }
          }
        },
        orderBy: { _count: { industry: 'desc' } },
        take: 5
      }),
      
      // Top lead sources
      prisma.lead.groupBy({
        by: ['source'],
        _count: { source: true },
        where: {
          ...dateFilter,
          source: { not: null }
        },
        orderBy: { _count: { source: 'desc' } },
        take: 5
      })
    ]);

    // Calculate key metrics
    const successRate = completedCalls > 0 ? (successfulCalls / completedCalls) * 100 : 0;
    const completionRate = totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0;
    const conversionRate = totalLeads > 0 ? (qualifiedLeads / totalLeads) * 100 : 0;

    // Format call outcomes for charts
    const outcomeData = callOutcomes.map(outcome => ({
      outcome: outcome.outcome,
      count: outcome._count.outcome,
      percentage: completedCalls > 0 ? Math.round((outcome._count.outcome / completedCalls) * 10000) / 100 : 0
    }));

    // Format daily trends
    const trendData = dailyCallStats.map(day => ({
      date: day.date,
      totalCalls: parseInt(day.total_calls),
      completedCalls: parseInt(day.completed_calls),
      successfulCalls: parseInt(day.successful_calls),
      successRate: day.completed_calls > 0 ? 
        Math.round((day.successful_calls / day.completed_calls) * 10000) / 100 : 0
    })).reverse(); // Reverse to show chronological order

    // Calculate performance indicators
    const performanceIndicators = {
      callVolume: {
        current: totalCalls,
        trend: calculateTrend(trendData, 'totalCalls'),
        status: totalCalls > 0 ? 'good' : 'warning'
      },
      successRate: {
        current: Math.round(successRate * 100) / 100,
        trend: calculateTrend(trendData, 'successRate'),
        status: successRate > 30 ? 'good' : successRate > 15 ? 'warning' : 'poor'
      },
      averageDuration: {
        current: Math.round(averageCallDuration._avg.duration || 0),
        trend: 'stable', // Would need historical data for trend
        status: (averageCallDuration._avg.duration || 0) > 120 ? 'good' : 'warning'
      },
      engagement: {
        current: Math.round((callAnalytics._avg.engagementScore || 0) * 100),
        trend: 'stable', // Would need historical data for trend
        status: (callAnalytics._avg.engagementScore || 0) > 0.6 ? 'good' : 'warning'
      }
    };

    // Prepare dashboard response
    const dashboardData = {
      overview: {
        totalCalls,
        completedCalls,
        inProgressCalls,
        scheduledCalls,
        successfulCalls,
        totalLeads,
        newLeads,
        qualifiedLeads
      },
      metrics: {
        successRate: Math.round(successRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        conversionRate: Math.round(conversionRate * 100) / 100,
        averageCallDuration: Math.round(averageCallDuration._avg.duration || 0),
        averageEngagement: Math.round((callAnalytics._avg.engagementScore || 0) * 100),
        averageConversionProbability: Math.round((callAnalytics._avg.conversionProbability || 0) * 100)
      },
      charts: {
        callOutcomes: outcomeData,
        dailyTrends: trendData,
        topIndustries: topIndustries.map(item => ({
          industry: item.industry,
          count: item._count.industry
        })),
        topSources: topSources.map(item => ({
          source: item.source,
          count: item._count.source
        }))
      },
      recentActivity: {
        calls: recentCalls.map(call => ({
          id: call.id,
          leadName: `${call.lead.firstName} ${call.lead.lastName}`,
          company: call.lead.company,
          phone: call.lead.phone,
          status: call.status,
          outcome: call.outcome,
          duration: call.duration,
          createdAt: call.createdAt
        })),
        leads: recentLeads.map(lead => ({
          id: lead.id,
          name: `${lead.firstName} ${lead.lastName}`,
          company: lead.company,
          status: lead.status,
          callCount: lead._count.calls,
          createdAt: lead.createdAt
        }))
      },
      performanceIndicators,
      timeframe,
      lastUpdated: new Date().toISOString()
    };

    res.json({
      success: true,
      dashboard: dashboardData
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard data',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/quick-stats
 * Get quick statistics for dashboard widgets
 */
router.get('/quick-stats', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const [
      todayCalls,
      yesterdayCalls,
      todayLeads,
      yesterdayLeads,
      activeCalls,
      scheduledCalls,
      pendingFollowUps
    ] = await Promise.all([
      prisma.call.count({ where: { createdAt: { gte: today } } }),
      prisma.call.count({ 
        where: { 
          createdAt: { 
            gte: yesterday,
            lt: today
          } 
        } 
      }),
      prisma.lead.count({ where: { createdAt: { gte: today } } }),
      prisma.lead.count({ 
        where: { 
          createdAt: { 
            gte: yesterday,
            lt: today
          } 
        } 
      }),
      prisma.call.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.call.count({ 
        where: { 
          status: 'SCHEDULED',
          scheduledAt: { gte: today }
        } 
      }),
      prisma.call.count({
        where: {
          followUpDate: {
            lte: new Date(Date.now() + 24 * 60 * 60 * 1000) // Next 24 hours
          },
          status: 'COMPLETED'
        }
      })
    ]);

    const callsChange = yesterdayCalls > 0 ? 
      Math.round(((todayCalls - yesterdayCalls) / yesterdayCalls) * 100) : 0;
    
    const leadsChange = yesterdayLeads > 0 ? 
      Math.round(((todayLeads - yesterdayLeads) / yesterdayLeads) * 100) : 0;

    res.json({
      success: true,
      quickStats: {
        todayCalls: {
          count: todayCalls,
          change: callsChange,
          trend: callsChange > 0 ? 'up' : callsChange < 0 ? 'down' : 'stable'
        },
        todayLeads: {
          count: todayLeads,
          change: leadsChange,
          trend: leadsChange > 0 ? 'up' : leadsChange < 0 ? 'down' : 'stable'
        },
        activeCalls,
        scheduledCalls,
        pendingFollowUps
      }
    });

  } catch (error) {
    console.error('Quick stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch quick statistics',
      message: error.message
    });
  }
});

/**
 * GET /api/dashboard/alerts
 * Get system alerts and notifications
 */
router.get('/alerts', async (req, res) => {
  try {
    const alerts = [];
    
    // Check for overdue follow-ups
    const overdueFollowUps = await prisma.call.count({
      where: {
        followUpDate: { lt: new Date() },
        status: 'COMPLETED',
        outcome: { in: ['CALLBACK_REQUESTED', 'INTERESTED'] }
      }
    });

    if (overdueFollowUps > 0) {
      alerts.push({
        type: 'warning',
        title: 'Overdue Follow-ups',
        message: `${overdueFollowUps} follow-up calls are overdue`,
        action: 'View overdue calls',
        priority: 'high'
      });
    }

    // Check for low success rate
    const recentCalls = await prisma.call.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        status: 'COMPLETED'
      }
    });

    const recentSuccessful = await prisma.call.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        outcome: { in: ['INTERESTED', 'MEETING_SCHEDULED', 'SALE_MADE'] }
      }
    });

    const weeklySuccessRate = recentCalls > 0 ? (recentSuccessful / recentCalls) * 100 : 0;

    if (weeklySuccessRate < 15 && recentCalls > 10) {
      alerts.push({
        type: 'error',
        title: 'Low Success Rate',
        message: `Weekly success rate is ${Math.round(weeklySuccessRate)}% - below target`,
        action: 'View analytics',
        priority: 'high'
      });
    }

    // Check for system performance
    const failedCalls = await prisma.call.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        status: 'FAILED'
      }
    });

    if (failedCalls > 5) {
      alerts.push({
        type: 'error',
        title: 'System Issues',
        message: `${failedCalls} calls failed in the last 24 hours`,
        action: 'Check system logs',
        priority: 'critical'
      });
    }

    // Check for new leads without calls
    const unleadedLeads = await prisma.lead.count({
      where: {
        createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
        calls: { none: {} }
      }
    });

    if (unleadedLeads > 0) {
      alerts.push({
        type: 'info',
        title: 'New Leads Available',
        message: `${unleadedLeads} new leads haven't been called yet`,
        action: 'Schedule calls',
        priority: 'medium'
      });
    }

    res.json({
      success: true,
      alerts: alerts.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
    });

  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({
      error: 'Failed to fetch alerts',
      message: error.message
    });
  }
});

/**
 * Helper function to calculate trend from time series data
 */
function calculateTrend(data, field) {
  if (data.length < 2) return 'stable';
  
  const recent = data.slice(-7); // Last 7 days
  const earlier = data.slice(-14, -7); // Previous 7 days
  
  if (recent.length === 0 || earlier.length === 0) return 'stable';
  
  const recentAvg = recent.reduce((sum, item) => sum + (item[field] || 0), 0) / recent.length;
  const earlierAvg = earlier.reduce((sum, item) => sum + (item[field] || 0), 0) / earlier.length;
  
  const change = earlierAvg > 0 ? ((recentAvg - earlierAvg) / earlierAvg) * 100 : 0;
  
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
}

module.exports = router;
