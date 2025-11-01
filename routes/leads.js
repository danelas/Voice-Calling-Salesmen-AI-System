const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * POST /api/leads
 * Create a new lead
 */
router.post('/', async (req, res) => {
  try {
    const {
      // Personal Information
      firstName,
      middleInitial,
      lastName,
      exactAge,
      email,
      
      // Contact Information
      phone,
      phoneType,
      
      // Address Information
      address,
      city,
      state,
      zipCode,
      zipCodePlus4,
      latitude,
      longitude,
      
      // Property Information
      homeValue,
      yearBuilt,
      purchasePrice,
      homePurchaseDate,
      yearsInResidence,
      propertyType,
      
      // Financial Information
      mostRecentMortgageDate,
      mostRecentMortgageAmount,
      loanToValue,
      estimatedIncome,
      estimatedIncomeCode,
      
      // Personal Demographics
      maritalStatus,
      presenceOfChildren,
      numberOfChildren,
      education,
      occupation,
      language,
      
      // Compliance
      dncStatus,
      
      // Business Information
      company,
      industry,
      
      // Lead Management
      source,
      notes
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !phone) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['firstName', 'lastName', 'phone']
      });
    }

    // Check if lead with this phone already exists
    const existingLead = await prisma.lead.findUnique({
      where: { phone: phone }
    });

    if (existingLead) {
      return res.status(409).json({
        error: 'Lead with this phone number already exists',
        existingLead: {
          id: existingLead.id,
          name: `${existingLead.firstName} ${existingLead.lastName}`,
          company: existingLead.company
        }
      });
    }

    const lead = await prisma.lead.create({
      data: {
        // Personal Information
        firstName,
        middleInitial,
        lastName,
        exactAge: exactAge ? parseInt(exactAge) : null,
        email,
        
        // Contact Information
        phone,
        phoneType,
        
        // Address Information
        address,
        city,
        state,
        zipCode,
        zipCodePlus4,
        latitude,
        longitude,
        
        // Property Information
        homeValue: homeValue ? parseFloat(homeValue) : null,
        yearBuilt: yearBuilt ? parseInt(yearBuilt) : null,
        purchasePrice: purchasePrice ? parseFloat(purchasePrice) : null,
        homePurchaseDate: homePurchaseDate ? new Date(homePurchaseDate) : null,
        yearsInResidence: yearsInResidence ? parseInt(yearsInResidence) : null,
        propertyType,
        
        // Financial Information
        mostRecentMortgageDate: mostRecentMortgageDate ? new Date(mostRecentMortgageDate) : null,
        mostRecentMortgageAmount: mostRecentMortgageAmount ? parseFloat(mostRecentMortgageAmount) : null,
        loanToValue: loanToValue ? parseFloat(loanToValue) : null,
        estimatedIncome: estimatedIncome ? parseFloat(estimatedIncome) : null,
        estimatedIncomeCode,
        
        // Personal Demographics
        maritalStatus,
        presenceOfChildren: presenceOfChildren ? Boolean(presenceOfChildren) : null,
        numberOfChildren: numberOfChildren ? parseInt(numberOfChildren) : null,
        education,
        occupation,
        language,
        
        // Compliance
        dncStatus,
        
        // Business Information
        company,
        industry,
        
        // Lead Management
        source,
        notes,
        status: 'NEW'
      }
    });

    res.status(201).json({
      success: true,
      lead: lead,
      message: 'Lead created successfully'
    });

  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({
      error: 'Failed to create lead',
      message: error.message
    });
  }
});

/**
 * GET /api/leads
 * Get leads with filtering and pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      industry,
      source,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (status) where.status = status;
    if (industry) where.industry = industry;
    if (source) where.source = source;

    // Apply search
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } }
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          calls: {
            select: {
              id: true,
              status: true,
              outcome: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          },
          _count: {
            select: { calls: true }
          }
        },
        orderBy: { [sortBy]: sortOrder },
        skip: parseInt(skip),
        take: parseInt(limit)
      }),
      prisma.lead.count({ where })
    ]);

    res.json({
      success: true,
      leads: leads,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({
      error: 'Failed to fetch leads',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/:leadId
 * Get detailed lead information
 */
router.get('/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        calls: {
          include: {
            analytics: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    // Calculate lead statistics
    const stats = {
      totalCalls: lead.calls.length,
      completedCalls: lead.calls.filter(call => call.status === 'COMPLETED').length,
      averageCallDuration: 0,
      lastCallDate: lead.calls.length > 0 ? lead.calls[0].createdAt : null,
      conversionProbability: 0
    };

    const completedCalls = lead.calls.filter(call => call.status === 'COMPLETED' && call.duration);
    if (completedCalls.length > 0) {
      stats.averageCallDuration = Math.round(
        completedCalls.reduce((sum, call) => sum + call.duration, 0) / completedCalls.length
      );
    }

    // Calculate average conversion probability from analytics
    const callsWithAnalytics = lead.calls.filter(call => call.analytics?.conversionProbability);
    if (callsWithAnalytics.length > 0) {
      stats.conversionProbability = callsWithAnalytics.reduce(
        (sum, call) => sum + call.analytics.conversionProbability, 0
      ) / callsWithAnalytics.length;
    }

    res.json({
      success: true,
      lead: lead,
      stats: stats
    });

  } catch (error) {
    console.error('Get lead error:', error);
    res.status(500).json({
      error: 'Failed to fetch lead',
      message: error.message
    });
  }
});

/**
 * PUT /api/leads/:leadId
 * Update lead information
 */
router.put('/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const updateData = req.body;

    // Remove fields that shouldn't be updated directly
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    const lead = await prisma.lead.update({
      where: { id: leadId },
      data: updateData
    });

    res.json({
      success: true,
      lead: lead,
      message: 'Lead updated successfully'
    });

  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    console.error('Update lead error:', error);
    res.status(500).json({
      error: 'Failed to update lead',
      message: error.message
    });
  }
});

/**
 * DELETE /api/leads/:leadId
 * Delete a lead (soft delete by updating status)
 */
router.delete('/:leadId', async (req, res) => {
  try {
    const { leadId } = req.params;
    const { permanent = false } = req.query;

    if (permanent === 'true') {
      // Hard delete - remove lead and all associated data
      await prisma.lead.delete({
        where: { id: leadId }
      });

      res.json({
        success: true,
        message: 'Lead permanently deleted'
      });
    } else {
      // Soft delete - mark as closed lost
      const lead = await prisma.lead.update({
        where: { id: leadId },
        data: {
          status: 'CLOSED_LOST',
          notes: `${req.body.notes || ''}\n\nLead marked as deleted on ${new Date().toISOString()}`
        }
      });

      res.json({
        success: true,
        lead: lead,
        message: 'Lead marked as deleted'
      });
    }

  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Lead not found' });
    }
    
    console.error('Delete lead error:', error);
    res.status(500).json({
      error: 'Failed to delete lead',
      message: error.message
    });
  }
});

/**
 * POST /api/leads/bulk
 * Create multiple leads from CSV or bulk data
 */
router.post('/bulk', async (req, res) => {
  try {
    const { leads } = req.body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({
        error: 'Invalid data format',
        message: 'Expected array of leads'
      });
    }

    const results = {
      created: [],
      errors: [],
      duplicates: []
    };

    for (const leadData of leads) {
      try {
        // Validate required fields
        if (!leadData.firstName || !leadData.lastName || !leadData.phone) {
          results.errors.push({
            data: leadData,
            error: 'Missing required fields: firstName, lastName, phone'
          });
          continue;
        }

        // Check for duplicates
        const existingLead = await prisma.lead.findUnique({
          where: { phone: leadData.phone }
        });

        if (existingLead) {
          results.duplicates.push({
            data: leadData,
            existing: existingLead
          });
          continue;
        }

        // Create lead
        const lead = await prisma.lead.create({
          data: {
            firstName: leadData.firstName,
            lastName: leadData.lastName,
            email: leadData.email,
            phone: leadData.phone,
            company: leadData.company,
            industry: leadData.industry,
            source: leadData.source || 'BULK_IMPORT',
            notes: leadData.notes,
            status: 'NEW'
          }
        });

        results.created.push(lead);

      } catch (error) {
        results.errors.push({
          data: leadData,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      results: results,
      summary: {
        total: leads.length,
        created: results.created.length,
        errors: results.errors.length,
        duplicates: results.duplicates.length
      }
    });

  } catch (error) {
    console.error('Bulk create leads error:', error);
    res.status(500).json({
      error: 'Failed to create leads in bulk',
      message: error.message
    });
  }
});

/**
 * GET /api/leads/stats/overview
 * Get lead statistics overview
 */
router.get('/stats/overview', async (req, res) => {
  try {
    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      closedWonLeads,
      closedLostLeads,
      leadsByIndustry,
      leadsBySource,
      recentLeads
    ] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.count({ where: { status: 'NEW' } }),
      prisma.lead.count({ where: { status: 'QUALIFIED' } }),
      prisma.lead.count({ where: { status: 'CLOSED_WON' } }),
      prisma.lead.count({ where: { status: 'CLOSED_LOST' } }),
      prisma.lead.groupBy({
        by: ['industry'],
        _count: { industry: true },
        where: { industry: { not: null } }
      }),
      prisma.lead.groupBy({
        by: ['source'],
        _count: { source: true },
        where: { source: { not: null } }
      }),
      prisma.lead.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: true,
          status: true,
          createdAt: true
        }
      })
    ]);

    const conversionRate = totalLeads > 0 ? (closedWonLeads / totalLeads) * 100 : 0;

    res.json({
      success: true,
      stats: {
        totalLeads,
        newLeads,
        qualifiedLeads,
        closedWonLeads,
        closedLostLeads,
        conversionRate: Math.round(conversionRate * 100) / 100,
        leadsByIndustry: leadsByIndustry.map(item => ({
          industry: item.industry,
          count: item._count.industry
        })),
        leadsBySource: leadsBySource.map(item => ({
          source: item.source,
          count: item._count.source
        })),
        recentLeads
      }
    });

  } catch (error) {
    console.error('Lead stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch lead statistics',
      message: error.message
    });
  }
});

module.exports = router;
