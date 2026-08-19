import { createClient } from "jsr:@supabase/supabase-js@2"
import crypto from "node:crypto";
import { Buffer } from "node:buffer";

// We need a Service Role key to bypass Row Level Security because this is a backend cron job
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SERVICE_ROLE_KEY") ?? ""
)

const ENCRYPTION_KEY = Deno.env.get('ENCRYPTION_KEY') || '12345678901234567890123456789012';

function decrypt(text: string) {
  if (!text) return text;
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift()!, 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

async function logSync(provider: string, status: string, message: string | null, accountPairId: string | null = null) {
  try {
    await supabase.from('SyncLog').insert({
      id: crypto.randomUUID(),
      provider,
      status,
      message: message ? message.substring(0, 255) : null,
      accountPairId,
      createdAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('Failed to write sync log:', err);
  }
}

// --- API Service Implementations ---
class PopAdsService {
  apiKey: string;
  baseUrl = 'https://www.popads.net/api';
  v2BaseUrl = 'https://www.popads.net/apiv2';
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getCampaignList() {
    const res = await fetch(`${this.baseUrl}/campaign_list?key=${this.apiKey}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`PopAds Error: ${res.statusText}`);
    return await res.json();
  }

  async getReports(startDate: string, endDate: string, groups = ['country'], timezone = 'UTC') {
    const params = new URLSearchParams();
    params.append('key', this.apiKey);
    params.append('start', startDate);
    params.append('end', endDate);
    params.append('zone', timezone);
    groups.forEach(group => params.append('groups[]', group));

    const res = await fetch(`${this.baseUrl}/report_advertiser`, {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    if (!res.ok) throw new Error(`PopAds Report Error: ${res.statusText}`);
    return await res.json();
  }

  async updateCampaignStatus(campaignId: string, status: string) {
    const action = status === 'Active' ? 'campaign_start' : 'campaign_pause';
    const params = new URLSearchParams();
    params.append('key', this.apiKey);
    params.append('campaign_id', campaignId);

    const res = await fetch(`${this.baseUrl}/${action}`, {
      method: 'POST',
      body: params,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    if (!res.ok) {
       let errText = res.statusText;
       try { errText = await res.text(); } catch(e){}
       throw new Error(`PopAds Error: ${errText}`);
    }
    return await res.json();
  }

  async updateCampaign(campaignId: string, data: any) {
    const payload: any = {};
    if (data.bid !== undefined) payload.max_bid = parseFloat(data.bid);
    if (data.daily_budget !== undefined) payload.budget = parseFloat(data.daily_budget);

    const res = await fetch(`${this.v2BaseUrl}/campaign/update/${campaignId}?key=${this.apiKey}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    
    if (!res.ok) {
       let errText = res.statusText;
       try { errText = await res.text(); } catch(e){}
       throw new Error(`PopAds Error: ${errText}`);
    }
    return await res.json();
  }

  async getCampaignListV2() {
    const res = await fetch(`${this.v2BaseUrl}/campaign/list`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`PopAds V2 Error: ${res.statusText}`);
    return await res.json();
  }

  async getCampaignDetail(campaignId: string) {
    const res = await fetch(`${this.v2BaseUrl}/campaign/get/${campaignId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Accept': 'application/json' }
    });
    if (!res.ok) throw new Error(`PopAds V2 Error: ${res.statusText}`);
    return await res.json();
  }
}

class AdsterraService {
  apiKey: string;
  baseUrl = `https://api3.adsterratools.com/publisher`;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getStats(startDate: string, endDate: string) {
    const url = new URL(`${this.baseUrl}/stats.json`);
    url.searchParams.append('start_date', startDate);
    url.searchParams.append('finish_date', endDate);
    url.searchParams.append('group_by', 'country');

    const res = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-API-Key': this.apiKey
      }
    });
    if (!res.ok) throw new Error(`Adsterra Stats Error: ${res.statusText}`);
    return await res.json();
  }
}

// --- Main Sync Logic ---
async function syncAccountPair(pair: any) {
  const { id: pairId, label } = pair;
  console.log(`[Sync] === Syncing account pair: "${label}" (${pairId}) ===`);

  try {
    const popAds = new PopAdsService(decrypt(pair.popadsApiKey));
    const adsterra = new AdsterraService(decrypt(pair.adsterraApiKey));

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const dateObj = new Date(today);

    // Auto-cleanup: delete data older than 90 days for this pair
    const cleanupDate = new Date(dateObj);
    cleanupDate.setDate(cleanupDate.getDate() - 90);
    await supabase.from('DailyProfitReport')
      .delete()
      .lt('date', cleanupDate.toISOString())
      .eq('accountPairId', pairId);

    // Phase 1: Fetch PopAds Campaign List
    console.log(`[Sync][${label}] Phase 1: Fetching PopAds campaigns...`);
    try {
      const campaignList = await popAds.getCampaignList();
      const campaignsArray = campaignList.campaigns || [];
      for (const camp of campaignsArray) {
        const dailyBudget = parseFloat(camp.budget || 0);
        let status = 'Active';
        if (camp.status === 'paused' || camp.aux_status === 'paused') status = 'Paused';
        else if (camp.status === 'out_of_money') status = 'Out of Money';
        else if (camp.status === 'rejected') status = 'Rejected';
        else if (camp.status === 'approved' || camp.status === 'active') status = 'Active';
        else status = camp.status || 'Unknown';

        // Check if exists
        const { data: existingCamp } = await supabase.from('PopadsCampaign')
          .select('id')
          .eq('campaignId', String(camp.id))
          .eq('accountPairId', pairId)
          .single();

        if (existingCamp) {
          await supabase.from('PopadsCampaign')
            .update({ name: camp.name, status: status, dailyBudget: dailyBudget, updatedAt: new Date().toISOString() })
            .eq('id', existingCamp.id);
        } else {
          await supabase.from('PopadsCampaign').insert({
            id: crypto.randomUUID(),
            campaignId: String(camp.id),
            name: camp.name || `Campaign ${camp.id}`,
            status: status,
            geo: 'Unknown',
            bid: 0,
            dailyBudget: dailyBudget,
            accountPairId: pairId,
            updatedAt: new Date().toISOString()
          });
        }
      }
      console.log(`[Sync][${label}] Updated ${campaignsArray.length} campaigns.`);
    } catch (e: any) {
      console.error(`[Sync][${label}] Phase 1 error:`, e.message);
      await logSync('popads', 'failed', `Campaign fetch error: ${e.message}`, pairId);
    }

    // Phase 2 & 3: Sync Date Data
    const syncDateData = async (targetDateStr: string) => {
      const targetDateObj = new Date(targetDateStr);
      console.log(`[Sync][${label}] Syncing data for date: ${targetDateStr}`);

      let popAdsCountryData: any = null;
      let adsterraData: any = null;

      // CLEANUP: Delete all 'ALL' campaign records for this date + pair
      await supabase.from('DailyProfitReport')
        .delete()
        .eq('date', targetDateObj.toISOString())
        .eq('campaignId', 'ALL')
        .eq('accountPairId', pairId);

      try {
        popAdsCountryData = await popAds.getReports(targetDateStr, targetDateStr, ['country'], 'UTC');
      } catch (e: any) {
        console.error(`[Sync][${label}] PopAds country fetch error:`, e.message);
      }
      
      try {
        adsterraData = await adsterra.getStats(targetDateStr, targetDateStr);
      } catch (e: any) {
        console.error(`[Sync][${label}] Adsterra fetch error:`, e.message);
      }

      if (adsterraData || popAdsCountryData) {
        const adsterraMap: Record<string, any> = {};
        if (adsterraData?.items) {
          for (const item of adsterraData.items) {
            const c = item.country || 'Unknown';
            if (!adsterraMap[c]) adsterraMap[c] = { revenue: 0, impressions: 0, cpm: 0 };
            adsterraMap[c].revenue += parseFloat(item.revenue || 0);
            adsterraMap[c].impressions += parseInt(item.impression || 0, 10);
            adsterraMap[c].cpm = parseFloat(item.cpm || item.ecpm || 0);
          }
        }

        const popAdsMap: Record<string, any> = {};
        if (popAdsCountryData?.rows) {
          for (const row of popAdsCountryData.rows) {
            const c = row.country || 'Unknown';
            if (!popAdsMap[c]) popAdsMap[c] = { cost: 0, impressions: 0 };
            popAdsMap[c].cost += parseFloat(row.cost || 0);
            popAdsMap[c].impressions += parseInt(row.impressions || 0, 10);
          }
        }

        const allCountries = new Set([...Object.keys(adsterraMap), ...Object.keys(popAdsMap)]);

        const reportsToInsert = [];
        for (const country of allCountries) {
          const rev = adsterraMap[country]?.revenue || 0;
          const spend = popAdsMap[country]?.cost || 0;
          const profit = rev - spend;
          const roi = spend > 0 ? (profit / spend) * 100 : 0;
          const impPopads = popAdsMap[country]?.impressions || 0;
          const impAdsterra = adsterraMap[country]?.impressions || 0;
          const countryBid = impPopads > 0 ? spend / impPopads : 0;
          const countryCpm = adsterraMap[country]?.cpm || (impAdsterra > 0 ? (rev / impAdsterra) * 1000 : 0);

          reportsToInsert.push({
            id: crypto.randomUUID(),
            date: targetDateObj.toISOString(), 
            campaignId: 'ALL', 
            country, 
            revenue: rev, 
            spend, 
            profit, 
            roi, 
            bid: countryBid, 
            cpm: countryCpm,
            impPopads, 
            impAdsterra, 
            accountPairId: pairId 
          });
        }
        
        if (reportsToInsert.length > 0) {
          await supabase.from('DailyProfitReport').insert(reportsToInsert);
        }
      }

      // Phase 3: Fetch PopAds Data Grouped by Campaign
      await supabase.from('DailyProfitReport')
        .delete()
        .eq('date', targetDateObj.toISOString())
        .eq('country', 'ALL')
        .neq('campaignId', 'ALL')
        .eq('accountPairId', pairId);

      try {
        const popAdsCampaignData = await popAds.getReports(targetDateStr, targetDateStr, ['campaign'], 'UTC');
        if (popAdsCampaignData?.rows) {
          const campReportsToInsert = [];
          for (const row of popAdsCampaignData.rows) {
            let campId = row.campaign ? String(row.campaign) : 'Unknown';
            
            const { data: matchedCamp } = await supabase.from('PopadsCampaign')
              .select('campaignId')
              .eq('name', campId)
              .eq('accountPairId', pairId)
              .maybeSingle();
            
            if (matchedCamp) campId = matchedCamp.campaignId;

            const spend = parseFloat(row.cost || 0);
            const impPopads = parseInt(row.impressions || 0, 10);
            const effectiveBid = impPopads > 0 ? spend / impPopads : 0;

            campReportsToInsert.push({
              id: crypto.randomUUID(),
              date: targetDateObj.toISOString(), 
              campaignId: campId, 
              country: 'ALL', 
              revenue: 0, 
              spend, 
              profit: 0 - spend, 
              roi: -100, 
              bid: effectiveBid,
              impPopads, 
              impAdsterra: 0, 
              accountPairId: pairId 
            });

            if (matchedCamp && effectiveBid > 0) {
              await supabase.from('PopadsCampaign')
                .update({ bid: effectiveBid })
                .eq('campaignId', campId)
                .eq('accountPairId', pairId);
            }
          }
          if (campReportsToInsert.length > 0) {
            await supabase.from('DailyProfitReport').insert(campReportsToInsert);
          }
        }
      } catch (e: any) {
        console.error(`[Sync][${label}] PopAds campaign fetch error:`, e.message);
      }
    };

    const yesterdayObj = new Date(dateObj);
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterday = yesterdayObj.toISOString().split('T')[0];

    await syncDateData(yesterday);
    await syncDateData(today);

    // Phase 4: Generate Smart Alerts
    console.log(`[Sync][${label}] Phase 4: Generating Smart Alerts...`);
    try {
      const { data: campaignReports } = await supabase.from('DailyProfitReport')
        .select('*')
        .eq('date', dateObj.toISOString())
        .eq('country', 'ALL')
        .neq('campaignId', 'ALL')
        .eq('accountPairId', pairId);

      if (campaignReports) {
        for (const report of campaignReports) {
          const { data: camp } = await supabase.from('PopadsCampaign')
            .select('name')
            .eq('campaignId', report.campaignId)
            .eq('accountPairId', pairId)
            .maybeSingle();
            
          const campName = camp ? camp.name : `Campaign ${report.campaignId}`;
          const roi = report.spend > 0 ? ((report.revenue - report.spend) / report.spend) * 100 : 0;

          // Alert: ROI below -50%
          if (report.spend > 0.1 && roi < -50) {
            const { data: existing } = await supabase.from('Alert')
              .select('id')
              .eq('type', 'roi_drop')
              .eq('campaignId', report.campaignId)
              .eq('accountPairId', pairId)
              .gte('createdAt', dateObj.toISOString())
              .maybeSingle();
              
            if (!existing) {
              await supabase.from('Alert').insert({
                id: crypto.randomUUID(),
                type: 'roi_drop', severity: 'critical',
                campaignId: report.campaignId, campaignName: campName,
                message: `[${label}] Campaign "${campName}" ROI dropped to ${roi.toFixed(1)}%. Spend: $${report.spend.toFixed(2)}. Consider pausing.`,
                value: roi, accountPairId: pairId,
                createdAt: new Date().toISOString()
              });
            }
          }

          // Alert: Spending but zero revenue
          if (report.spend > 0.5 && report.revenue === 0) {
            const { data: existing } = await supabase.from('Alert')
              .select('id')
              .eq('type', 'no_revenue')
              .eq('campaignId', report.campaignId)
              .eq('accountPairId', pairId)
              .gte('createdAt', dateObj.toISOString())
              .maybeSingle();
              
            if (!existing) {
              await supabase.from('Alert').insert({
                id: crypto.randomUUID(),
                type: 'no_revenue', severity: 'warning',
                campaignId: report.campaignId, campaignName: campName,
                message: `[${label}] Campaign "${campName}" spent $${report.spend.toFixed(2)} but earned $0 revenue today.`,
                value: report.spend, accountPairId: pairId,
                createdAt: new Date().toISOString()
              });
            }
          }
        }
      }

      // Cleanup old alerts for this pair
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('Alert')
        .delete()
        .eq('accountPairId', pairId)
        .lt('createdAt', thirtyDaysAgo);
        
    } catch (e: any) {
      console.error(`[Sync][${label}] Alert generation error:`, e.message);
    }

    await logSync('system', 'success', `Sync completed for "${label}"`, pairId);
    return true;

  } catch (error: any) {
    console.error(`[Sync][${label}] Sync failed:`, error);
    await logSync('system', 'failed', `${label}: ${error.message}`, pairId);
    return false;
  }
}

Deno.serve(async (req) => {
  // Strict authorization check for the Gateway
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${Deno.env.get('SERVICE_ROLE_KEY')}`) {
    console.warn("Unauthenticated request to sync-ads-data");
    // Return 401 instead of proceeding so that random internet scanners can't use our proxy
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }

  let body: any = { action: 'sync_all' };
  if (req.method === 'POST') {
    try {
      body = await req.json();
    } catch(e) {
      console.warn("Could not parse JSON body, falling back to sync_all");
    }
  }

  const { action, accountId, campaignId, status, bid, budget, date } = body;

  try {
    if (action === 'sync_all') {
      const { data: pairs, error } = await supabase.from('AccountPair').select('*').eq('isActive', true);
      
      if (error) throw error;

      if (!pairs || pairs.length === 0) {
        const msg = 'No active account pairs configured. Skipping sync.';
        console.warn(`[Sync] ${msg}`);
        await logSync('system', 'failed', 'No active account pairs configured');
        return new Response(JSON.stringify({ success: false, message: msg }), { headers: { "Content-Type": "application/json" } });
      }

      let successCount = 0;
      for (const pair of pairs) {
        const ok = await syncAccountPair(pair);
        if (ok) successCount++;
      }

      const msg = `Synced ${successCount}/${pairs.length} account pairs successfully`;
      console.log(`[Sync] ${msg}`);
      return new Response(JSON.stringify({ success: true, message: msg }), { headers: { "Content-Type": "application/json" } });
    } 
    else if (action === 'manual_sync') {
      if (!accountId) throw new Error("accountId is required");
      const { data: pair, error } = await supabase.from('AccountPair').select('*').eq('id', accountId).single();
      if (error || !pair) throw new Error("Account pair not found");
      
      const ok = await syncAccountPair(pair);
      return new Response(JSON.stringify({ success: ok, message: ok ? "Sync completed successfully" : "Sync failed" }), { headers: { "Content-Type": "application/json" } });
    }
    else if (action === 'update_status') {
      const { data: pair } = await supabase.from('AccountPair').select('*').eq('id', accountId).single();
      if (!pair) throw new Error("Account pair not found");
      const popAds = new PopAdsService(decrypt(pair.popadsApiKey));
      const result = await popAds.updateCampaignStatus(campaignId, status);
      return new Response(JSON.stringify({ success: true, result }), { headers: { "Content-Type": "application/json" } });
    }
    else if (action === 'update_settings') {
      const { data: pair } = await supabase.from('AccountPair').select('*').eq('id', accountId).single();
      if (!pair) throw new Error("Account pair not found");
      const popAds = new PopAdsService(decrypt(pair.popadsApiKey));
      const result = await popAds.updateCampaign(campaignId, { bid, daily_budget: budget });
      return new Response(JSON.stringify({ success: true, result }), { headers: { "Content-Type": "application/json" } });
    }
    else if (action === 'get_sources') {
      const { data: pair } = await supabase.from('AccountPair').select('*').eq('id', accountId).single();
      if (!pair) throw new Error("Account pair not found");
      const popAds = new PopAdsService(decrypt(pair.popadsApiKey));
      const result = await popAds.getReports(date, date, ['website'], 'UTC');
      return new Response(JSON.stringify({ success: true, result }), { headers: { "Content-Type": "application/json" } });
    }
    else if (action === 'debug_raw') {
      const { data: pair } = await supabase.from('AccountPair').select('*').eq('id', accountId).single();
      if (!pair) throw new Error("Account pair not found");
      const popAds = new PopAdsService(decrypt(pair.popadsApiKey));
      
      let v1Result: any = null;
      try { v1Result = await popAds.getCampaignList(); } catch (e:any) { v1Result = { error: e.message }; }
      
      const v1Campaigns = v1Result?.campaigns || v1Result || [];
      const v1First = Array.isArray(v1Campaigns) && v1Campaigns[0] ? v1Campaigns[0] : null;

      let v2Result: any = null;
      try { v2Result = await popAds.getCampaignListV2(); } catch (e:any) { v2Result = { error: e.message }; }
      
      let v2Detail: any = null;
      if (v1First) {
        try { v2Detail = await popAds.getCampaignDetail(String(v1First.id)); } catch (e:any) { v2Detail = { error: e.message }; }
      }

      return new Response(JSON.stringify({ 
        success: true, 
        v1: v1Result, 
        v2_list: v2Result, 
        v2_detail: v2Detail 
      }), { headers: { "Content-Type": "application/json" } });
    }
    else {
      return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

  } catch (error: any) {
    console.error(`[Gateway Error] Action: ${action}`, error);
    // Don't log normal failures to DB unless it's sync_all to avoid spam
    if (action === 'sync_all' || action === 'manual_sync') {
        await logSync('system', 'failed', error.message, accountId);
    }
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
})
