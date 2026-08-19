const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { encrypt, decrypt } = require('../utils/crypto');
const axios = require('axios');

async function callGateway(action, payload) {
  const url = `${process.env.SUPABASE_URL || 'https://plpgetjaeervwivznkdz.supabase.co'}/functions/v1/sync-ads-data`;
  try {
    const res = await axios.post(url, { action, ...payload }, {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return res.data;
  } catch (error) {
    if (error.response && error.response.data) {
      throw new Error(error.response.data.error || JSON.stringify(error.response.data));
    }
    throw error;
  }
}

// Middleware to check if user owns the account
async function verifyOwnership(req, res, next) {
  // Cron jobs don't have req.user (bypassed via CRON_SECRET), skip check
  if (!req.user) return next();
  
  // Super admin can access everything
  if (req.user.role === 'admin') return next();

  // Find accountId from any common source
  let accountId = req.query.accountId || req.body.accountId;
  if (!accountId && req.route && req.route.path === '/accounts/:id') {
    accountId = req.params.id;
  }
  
  if (!accountId) return next();

  try {
    const account = await prisma.accountPair.findUnique({ where: { id: accountId } });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    
    // If account has an owner, and it's not the current user, deny access
    // (Allow access to legacy accounts where userId is null)
    if (account.userId && account.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this account' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// ==================== SYSTEM ====================

router.all('/sync/manual', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    // If accountId is provided, sync that specific account, otherwise sync all.
    const action = accountId ? 'manual_sync' : 'sync_all';
    const payload = accountId ? { accountId } : {};

    const result = await callGateway(action, payload);
    
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, error: result.error || result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DEBUG: Inspect raw PopAds API response to see field names
router.get('/debug/popads-raw', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    if (!accountId) return res.status(400).json({ error: 'accountId required' });

    const result = await callGateway('debug_raw', { accountId });
    
    if (result.v1 && !result.v1.error) {
      const v1Campaigns = result.v1.campaigns || result.v1 || [];
      const v1First = Array.isArray(v1Campaigns) && v1Campaigns[0] ? v1Campaigns[0] : null;
      
      res.json({
        v1: {
          responseKeys: Object.keys(result.v1 || {}),
          campaignKeys: v1First ? Object.keys(v1First) : [],
          sample: Array.isArray(v1Campaigns) ? v1Campaigns.slice(0, 2) : v1Campaigns,
          total: Array.isArray(v1Campaigns) ? v1Campaigns.length : 'not array'
        },
        v2_list: result.v2_list,
        v2_detail: result.v2_detail
      });
    } else {
      res.json(result);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ACCOUNT PAIRS ====================

// GET all account pairs (masked keys)
router.get('/accounts', async (req, res) => {
  try {
    let where = {};
    if (req.user && req.user.role !== 'admin') {
      where = {
        OR: [
          { userId: req.user.id },
          { userId: null } // Allow access to legacy accounts for smooth transition
        ]
      };
    }
    const pairs = await prisma.accountPair.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });
    const mapped = pairs.map(p => {
      const popKey = decrypt(p.popadsApiKey);
      const adKey = decrypt(p.adsterraApiKey);
      return {
        id: p.id,
        label: p.label,
        isActive: p.isActive,
        popadsKey: popKey.length > 8 ? '••••••••' + popKey.slice(-4) : '••••••••',
        adsterraKey: adKey.length > 8 ? '••••••••' + adKey.slice(-4) : '••••••••',
        createdAt: p.createdAt
      };
    });
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST create new account pair
router.post('/accounts', async (req, res) => {
  try {
    const { label, popadsApiKey, adsterraApiKey } = req.body;
    if (!label || !popadsApiKey || !adsterraApiKey) {
      return res.status(400).json({ error: 'Label, PopAds API Key, and Adsterra API Key are required.' });
    }

    const pair = await prisma.accountPair.create({
      data: {
        label,
        popadsApiKey: encrypt(popadsApiKey),
        adsterraApiKey: encrypt(adsterraApiKey),
        isActive: true,
        userId: req.user ? req.user.id : null // Bind to the current user
      }
    });

    res.json({ success: true, id: pair.id, label: pair.label });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT update account pair
router.put('/accounts/:id', verifyOwnership, async (req, res) => {
  try {
    const { id } = req.params;
    const { label, popadsApiKey, adsterraApiKey, isActive } = req.body;

    const updateData = {};
    if (label !== undefined) updateData.label = label;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (popadsApiKey && !popadsApiKey.startsWith('••••')) {
      updateData.popadsApiKey = encrypt(popadsApiKey);
    }
    if (adsterraApiKey && !adsterraApiKey.startsWith('••••')) {
      updateData.adsterraApiKey = encrypt(adsterraApiKey);
    }

    const pair = await prisma.accountPair.update({
      where: { id },
      data: updateData
    });

    res.json({ success: true, id: pair.id, label: pair.label });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE account pair (cascades to all related data)
router.delete('/accounts/:id', verifyOwnership, async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.accountPair.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protect all subsequent routes with ownership verification
router.use(verifyOwnership);

// ==================== DASHBOARD ====================

router.get('/dashboard/overview', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const accountId = req.query.accountId;
    
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const targetDate = new Date(dateStr);
    const prevDate = new Date(targetDate);
    prevDate.setDate(prevDate.getDate() - 1);

    const accountFilter = { accountPairId: accountId };

    const todayStats = await prisma.dailyProfitReport.aggregate({
      where: { date: targetDate, campaignId: 'ALL', ...accountFilter },
      _sum: { spend: true, revenue: true, profit: true }
    });

    const yestStats = await prisma.dailyProfitReport.aggregate({
      where: { date: prevDate, campaignId: 'ALL', ...accountFilter },
      _sum: { spend: true, revenue: true, profit: true }
    });

    const totalSpend = todayStats._sum.spend || 0;
    const totalRevenue = todayStats._sum.revenue || 0;
    const netProfit = todayStats._sum.profit || 0;
    const roi = totalSpend > 0 ? (netProfit / totalSpend) * 100 : 0;

    const yestSpend = yestStats._sum.spend || 0;
    const yestRevenue = yestStats._sum.revenue || 0;
    const yestProfit = yestStats._sum.profit || 0;

    const spendTrend = yestSpend > 0 ? ((totalSpend - yestSpend) / yestSpend) * 100 : 0;
    const revTrend = yestRevenue > 0 ? ((totalRevenue - yestRevenue) / yestRevenue) * 100 : 0;
    const profitTrend = yestProfit !== 0 ? ((netProfit - yestProfit) / Math.abs(yestProfit)) * 100 : 0;

    const topCampaignReports = await prisma.dailyProfitReport.groupBy({
      by: ['campaignId'],
      where: { date: targetDate, country: 'ALL', campaignId: { not: 'ALL' }, ...accountFilter },
      _sum: { spend: true, revenue: true, profit: true },
      orderBy: { _sum: { spend: 'desc' } },
      take: 5
    });

    const topCampaigns = await Promise.all(topCampaignReports.map(async (r) => {
      const camp = await prisma.popadsCampaign.findFirst({
        where: { campaignId: r.campaignId, ...accountFilter }
      });
      const spend = r._sum.spend || 0;
      const revenue = r._sum.revenue || 0;
      const profit = revenue - spend;
      const campRoi = spend > 0 ? (profit / spend) * 100 : 0;
      return {
        name: camp ? camp.name : `Campaign ${r.campaignId}`,
        spend, revenue, profit, roi: campRoi
      };
    }));

    res.json({
      totalSpend, totalRevenue, netProfit, roi,
      trends: {
        spend: parseFloat(spendTrend.toFixed(1)),
        revenue: parseFloat(revTrend.toFixed(1)),
        profit: parseFloat(profitTrend.toFixed(1))
      },
      topCampaigns
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== CAMPAIGNS ====================

router.get('/campaigns', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const campaigns = await prisma.popadsCampaign.findMany({
      where: { accountPairId: accountId },
      orderBy: { updatedAt: 'desc' }
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const dateObj = new Date(dateStr);

    const enriched = await Promise.all(campaigns.map(async (c) => {
      const report = await prisma.dailyProfitReport.findFirst({
        where: { campaignId: c.campaignId, date: dateObj, country: 'ALL', accountPairId: accountId }
      });
      return {
        id: c.campaignId,
        name: c.name,
        status: c.status,
        geo: c.geo,
        bid: c.bid,
        budget: c.dailyBudget,
        spend: report?.spend || 0,
        revenue: report?.revenue || 0
      };
    }));

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/campaigns/:id/status', async (req, res) => {
  try {
    const { id: campaignId } = req.params;
    const { status } = req.body;
    const accountId = req.query.accountId || req.body.accountId;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const result = await callGateway('update_status', { accountId, campaignId, status });

    await prisma.popadsCampaign.updateMany({
      where: { campaignId, accountPairId: accountId },
      data: { status }
    });

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/campaigns/:id/settings', async (req, res) => {
  try {
    const { id: campaignId } = req.params;
    const { bid, budget } = req.body;
    const accountId = req.query.accountId || req.body.accountId;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const result = await callGateway('update_settings', { 
      accountId, 
      campaignId, 
      bid: parseFloat(bid), 
      budget: parseFloat(budget) 
    });

    await prisma.popadsCampaign.updateMany({
      where: { campaignId, accountPairId: accountId },
      data: { bid: parseFloat(bid), dailyBudget: parseFloat(budget) }
    });

    res.json({ success: true, result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== REPORTS ====================

router.get('/reports/geo', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const accountId = req.query.accountId;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const dateObj = new Date(dateStr);

    const reports = await prisma.dailyProfitReport.findMany({
      where: { date: dateObj, campaignId: 'ALL', country: { not: 'ALL' }, accountPairId: accountId }
    });

    const mapped = reports.map(r => ({
      country: r.country,
      bid: r.bid || 0,
      cpm: r.cpm || 0,
      impPopads: r.impPopads,
      impAdsterra: r.impAdsterra,
      spend: r.spend,
      rev: r.revenue,
    }));

    mapped.sort((a, b) => b.spend - a.spend);
    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/profitability', async (req, res) => {
  try {
    const startDate = req.query.start;
    const endDate = req.query.end;
    const accountId = req.query.accountId;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });
    if (!startDate || !endDate) return res.status(400).json({ error: 'start and end dates required' });

    const start = new Date(startDate);
    const end = new Date(endDate);

    const reports = await prisma.dailyProfitReport.groupBy({
      by: ['date'],
      where: {
        date: { gte: start, lte: end },
        campaignId: 'ALL',
        country: { not: 'ALL' },
        accountPairId: accountId
      },
      _sum: { spend: true, revenue: true, profit: true, impPopads: true, impAdsterra: true }
    });

    reports.sort((a, b) => new Date(a.date) - new Date(b.date));

    const daily = reports.map(r => {
      const spend = r._sum.spend || 0;
      const revenue = r._sum.revenue || 0;
      const profit = r._sum.profit || 0;
      const roi = spend > 0 ? (profit / spend) * 100 : 0;
      return {
        date: new Date(r.date).toISOString().split('T')[0],
        spend, revenue, profit, roi,
        impPopads: r._sum.impPopads || 0,
        impAdsterra: r._sum.impAdsterra || 0
      };
    });

    const totalSpend = daily.reduce((s, d) => s + d.spend, 0);
    const totalRevenue = daily.reduce((s, d) => s + d.revenue, 0);
    const totalProfit = totalRevenue - totalSpend;
    const avgRoi = totalSpend > 0 ? (totalProfit / totalSpend) * 100 : 0;

    res.json({
      summary: { totalSpend, totalRevenue, totalProfit, avgRoi, startDate, endDate },
      daily
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/trend', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const accountId = req.query.accountId;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const endDate = new Date(new Date().toISOString().split('T')[0]);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (days - 1));

    const reports = await prisma.dailyProfitReport.groupBy({
      by: ['date'],
      where: {
        date: { gte: startDate, lte: endDate },
        campaignId: 'ALL',
        country: 'ALL',
        accountPairId: accountId
      },
      _sum: { spend: true, revenue: true, profit: true, impPopads: true, impAdsterra: true }
    });

    reports.sort((a, b) => new Date(a.date) - new Date(b.date));

    const dailyData = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dateStr = cursor.toISOString().split('T')[0];
      const match = reports.find(r => new Date(r.date).toISOString().split('T')[0] === dateStr);
      const spend = match?._sum?.spend || 0;
      const revenue = match?._sum?.revenue || 0;
      const profit = match?._sum?.profit || 0;
      const roi = spend > 0 ? (profit / spend) * 100 : 0;
      dailyData.push({
        date: dateStr,
        label: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        spend, revenue, profit, roi,
        impPopads: match?._sum?.impPopads || 0,
        impAdsterra: match?._sum?.impAdsterra || 0
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    res.json(dailyData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/reports/campaign-profitability', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const accountId = req.query.accountId;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const targetDate = new Date(dateStr);

    const reports = await prisma.dailyProfitReport.findMany({
      where: { date: targetDate, country: 'ALL', campaignId: { not: 'ALL' }, accountPairId: accountId }
    });

    const enriched = await Promise.all(reports.map(async (r) => {
      const camp = await prisma.popadsCampaign.findFirst({
        where: { campaignId: r.campaignId, accountPairId: accountId }
      });
      const roi = r.spend > 0 ? ((r.revenue - r.spend) / r.spend) * 100 : 0;
      return {
        campaignId: r.campaignId,
        name: camp ? camp.name : `Campaign ${r.campaignId}`,
        geo: camp?.geo || 'Unknown',
        status: camp?.status || 'Unknown',
        spend: r.spend, revenue: r.revenue,
        profit: r.revenue - r.spend, roi,
        impPopads: r.impPopads, impAdsterra: r.impAdsterra
      };
    }));

    enriched.sort((a, b) => b.spend - a.spend);

    const totalSpend = enriched.reduce((s, r) => s + r.spend, 0);
    const totalRevenue = enriched.reduce((s, r) => s + r.revenue, 0);
    const totalProfit = totalRevenue - totalSpend;
    const avgRoi = totalSpend > 0 ? (totalProfit / totalSpend) * 100 : 0;

    res.json({
      date: dateStr,
      summary: { totalSpend, totalRevenue, totalProfit, avgRoi, campaignCount: enriched.length },
      campaigns: enriched
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== ALERTS ====================

router.get('/alerts', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    let where = accountId ? { accountPairId: accountId } : {};
    if (!accountId && req.user && req.user.role !== 'admin') {
      const userAccounts = await prisma.accountPair.findMany({
        where: { OR: [{ userId: req.user.id }, { userId: null }] },
        select: { id: true }
      });
      where.accountPairId = { in: userAccounts.map(a => a.id) };
    }
    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200
    });
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/alerts/summary', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    let where = accountId ? { accountPairId: accountId } : {};
    if (!accountId && req.user && req.user.role !== 'admin') {
      const userAccounts = await prisma.accountPair.findMany({
        where: { OR: [{ userId: req.user.id }, { userId: null }] },
        select: { id: true }
      });
      where.accountPairId = { in: userAccounts.map(a => a.id) };
    }

    const unreadCount = await prisma.alert.count({ where: { ...where, isRead: false } });
    const recentAlerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5
    });
    res.json({ unreadCount, recentAlerts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/alerts/:id/read', async (req, res) => {
  try {
    await prisma.alert.update({ where: { id: req.params.id }, data: { isRead: true } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/alerts/read-all', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    let where = accountId ? { accountPairId: accountId, isRead: false } : { isRead: false };
    if (!accountId && req.user && req.user.role !== 'admin') {
      const userAccounts = await prisma.accountPair.findMany({
        where: { OR: [{ userId: req.user.id }, { userId: null }] },
        select: { id: true }
      });
      where.accountPairId = { in: userAccounts.map(a => a.id) };
    }
    await prisma.alert.updateMany({ where, data: { isRead: true } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SOURCES ====================

router.get('/sources', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const accountId = req.query.accountId;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const response = await callGateway('get_sources', { accountId, date: dateStr });
    const popAdsData = response.result;

    const sources = [];
    if (popAdsData && popAdsData.rows) {
      for (let row of popAdsData.rows) {
        sources.push({
          sourceId: row.website || 'Unknown',
          impressions: parseInt(row.impressions || 0, 10),
          spend: parseFloat(row.cost || 0),
          bid: parseFloat(row.bid || 0)
        });
      }
    }
    sources.sort((a, b) => b.spend - a.spend);
    res.json(sources);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== RECOMMENDATIONS ====================

router.get('/recommendations', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    if (!accountId) return res.status(400).json({ error: 'accountId is required' });

    const dateStr = new Date().toISOString().split('T')[0];
    const dateObj = new Date(dateStr);

    const reports = await prisma.dailyProfitReport.findMany({
      where: { date: dateObj, country: 'ALL', campaignId: { not: 'ALL' }, accountPairId: accountId }
    });

    const recommendations = [];

    for (let report of reports) {
      const camp = await prisma.popadsCampaign.findFirst({
        where: { campaignId: report.campaignId, accountPairId: accountId }
      });
      const campName = camp ? camp.name : `Campaign ${report.campaignId}`;
      const roi = report.spend > 0 ? ((report.revenue - report.spend) / report.spend) * 100 : 0;

      if (report.spend > 0.5 && roi < -80) {
        recommendations.push({ type: 'pause', campaign: campName, campaignId: report.campaignId, reason: `ROI is ${roi.toFixed(1)}%. Stop burning money.`, urgency: 'critical', spend: report.spend, revenue: report.revenue, roi });
      } else if (report.spend > 0.1 && roi < -30) {
        recommendations.push({ type: 'reduce_bid', campaign: campName, campaignId: report.campaignId, reason: `ROI is ${roi.toFixed(1)}%. Consider lowering your bid.`, urgency: 'warning', spend: report.spend, revenue: report.revenue, roi });
      } else if (report.spend > 0 && roi > 50) {
        recommendations.push({ type: 'scale', campaign: campName, campaignId: report.campaignId, reason: `ROI is +${roi.toFixed(1)}%! Increase budget to scale.`, urgency: 'opportunity', spend: report.spend, revenue: report.revenue, roi });
      }
    }

    recommendations.sort((a, b) => a.roi - b.roi);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== SYNC LOGS ====================

router.get('/sync-logs', async (req, res) => {
  try {
    const accountId = req.query.accountId;
    let where = accountId ? { accountPairId: accountId } : {};
    if (!accountId && req.user && req.user.role !== 'admin') {
      const userAccounts = await prisma.accountPair.findMany({
        where: { OR: [{ userId: req.user.id }, { userId: null }] },
        select: { id: true }
      });
      where.accountPairId = { in: userAccounts.map(a => a.id) };
    }
    const logs = await prisma.syncLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==================== EXPORT ====================

router.get('/export/profitability', async (req, res) => {
  try {
    const { start, end } = req.query;
    const accountId = req.query.accountId;
    if (!start || !end) return res.status(400).json({ error: 'start and end dates required' });

    const reports = await prisma.dailyProfitReport.findMany({
      where: {
        date: { gte: new Date(start), lte: new Date(end) },
        campaignId: 'ALL',
        ...(accountId ? { accountPairId: accountId } : {})
      },
      orderBy: { date: 'asc' }
    });

    let csv = 'Date,Country,Spend,Revenue,Profit,ROI,Imp_PopAds,Imp_Adsterra\n';
    for (let r of reports) {
      csv += `${new Date(r.date).toISOString().split('T')[0]},${r.country},${r.spend},${r.revenue},${r.profit},${r.roi.toFixed(1)},${r.impPopads},${r.impAdsterra}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=profitability_${start}_${end}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/export/geo', async (req, res) => {
  try {
    const dateStr = req.query.date || new Date().toISOString().split('T')[0];
    const accountId = req.query.accountId;

    const reports = await prisma.dailyProfitReport.findMany({
      where: {
        date: new Date(dateStr),
        campaignId: 'ALL',
        country: { not: 'ALL' },
        ...(accountId ? { accountPairId: accountId } : {})
      },
      orderBy: { spend: 'desc' }
    });

    let csv = 'Country,Spend,Revenue,Profit,ROI,Imp_PopAds,Imp_Adsterra\n';
    for (let r of reports) {
      const profit = r.revenue - r.spend;
      const roi = r.spend > 0 ? (profit / r.spend) * 100 : 0;
      csv += `${r.country},${r.spend},${r.revenue},${profit.toFixed(2)},${roi.toFixed(1)},${r.impPopads},${r.impAdsterra}\n`;
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=geo_report_${dateStr}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
