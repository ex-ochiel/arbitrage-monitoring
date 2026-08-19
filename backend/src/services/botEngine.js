const prisma = require('../utils/prisma');
const { decrypt } = require('../utils/crypto');
const axios = require('axios');

async function runLogicBot(accountId) {
  try {
    // Fetch active rules for the account
    const activeRules = await prisma.botLogic.findMany({
      where: { accountPairId: accountId, isActive: true }
    });

    if (activeRules.length === 0) return;

    // Get the account to decrypt PopAds API Key
    const account = await prisma.accountPair.findUnique({
      where: { id: accountId }
    });

    if (!account || !account.popadsApiKey) return;
    const popadsKey = decrypt(account.popadsApiKey);
    const dateStr = new Date().toISOString().split('T')[0];
    const targetDate = new Date(dateStr);

    for (const rule of activeRules) {
      if (rule.ruleType === 'REMOVE_COUNTRY_LOW_CPM') {
        // Find countries for this campaign where CPM is below threshold today
        // We only consider records where there is some spend (to avoid banning countries with 0 impressions)
        const reports = await prisma.dailyProfitReport.findMany({
          where: {
            date: targetDate,
            campaignId: rule.campaignId,
            country: { not: 'ALL' },
            accountPairId: accountId,
            spend: { gt: 0 },
            cpm: { lt: rule.threshold }
          }
        });

        for (const report of reports) {
          const badCountry = report.country;
          
          try {
            // Create an alert indicating the bot caught this
            await prisma.alert.create({
              data: {
                type: 'bot_action',
                severity: 'warning',
                campaignId: rule.campaignId,
                campaignName: `Campaign ${rule.campaignId}`,
                message: `🤖 Logic Bot: Country ${badCountry} has CPM ${report.cpm.toFixed(4)} (Threshold: ${rule.threshold}). Bot simulated exclusion.`,
                accountPairId: accountId
              }
            });
            
          } catch (apiError) {
            console.error(`Bot Engine: Failed to log alert for ${rule.campaignId}:`, apiError.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Logic Bot Execution Error:', error);
  }
}

module.exports = {
  runLogicBot
};
