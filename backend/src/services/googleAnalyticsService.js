const { BetaAnalyticsDataClient } = require('@google-analytics/data');

/**
 * Google Analytics Data API Service
 * Provides access to GA4 visitor statistics
 * Documentation: https://developers.google.com/analytics/devguides/reporting/data/v1
 */

let analyticsClient = null;

/**
 * Get authenticated Analytics Data client
 */
const getAnalyticsClient = () => {
  if (analyticsClient) return analyticsClient;

  const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    console.error('❌ GOOGLE_SERVICE_ACCOUNT_JSON not configured');
    return null;
  }

  try {
    // Fix Railway's handling of newlines in JSON
    let fixedJson = serviceAccountJson.replace(/\r?\n/g, '\\n');
    const credentials = JSON.parse(fixedJson);

    // Fix newlines in private key
    if (credentials.private_key) {
      credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
    }

    analyticsClient = new BetaAnalyticsDataClient({
      credentials: credentials,
    });

    console.log('✅ Google Analytics client initialized');
    return analyticsClient;
  } catch (error) {
    console.error('❌ Failed to initialize Analytics client:', error.message);
    return null;
  }
};

/**
 * Get visitor statistics for a date range
 * @param {string} propertyId - GA4 Property ID (just numbers)
 * @param {string} startDate - Start date (YYYY-MM-DD or 'NdaysAgo')
 * @param {string} endDate - End date (YYYY-MM-DD or 'today')
 */
const getVisitorStats = async (propertyId, startDate = '30daysAgo', endDate = 'today') => {
  try {
    const client = getAnalyticsClient();
    if (!client) {
      return { error: 'Analytics client not configured' };
    }

    console.log(`📊 Fetching visitor stats for property ${propertyId}`);

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'date' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' },
      ],
      orderBys: [{ dimension: { dimensionName: 'date' }, desc: false }],
    });

    const dailyStats = response.rows?.map(row => ({
      date: row.dimensionValues[0].value,
      activeUsers: parseInt(row.metricValues[0].value) || 0,
      newUsers: parseInt(row.metricValues[1].value) || 0,
      sessions: parseInt(row.metricValues[2].value) || 0,
      pageViews: parseInt(row.metricValues[3].value) || 0,
      avgSessionDuration: parseFloat(row.metricValues[4].value) || 0,
      bounceRate: parseFloat(row.metricValues[5].value) || 0,
    })) || [];

    // Calculate totals
    const totals = dailyStats.reduce((acc, day) => ({
      activeUsers: acc.activeUsers + day.activeUsers,
      newUsers: acc.newUsers + day.newUsers,
      sessions: acc.sessions + day.sessions,
      pageViews: acc.pageViews + day.pageViews,
    }), { activeUsers: 0, newUsers: 0, sessions: 0, pageViews: 0 });

    console.log(`✅ Retrieved ${dailyStats.length} days of visitor data`);

    return {
      success: true,
      propertyId,
      dateRange: { startDate, endDate },
      totals,
      dailyStats,
    };
  } catch (error) {
    console.error('❌ Error fetching visitor stats:', error.message);
    return { error: error.message };
  }
};

/**
 * Get traffic sources breakdown
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 */
const getTrafficSources = async (propertyId, startDate = '30daysAgo', endDate = 'today') => {
  try {
    const client = getAnalyticsClient();
    if (!client) {
      return { error: 'Analytics client not configured' };
    }

    console.log(`📊 Fetching traffic sources for property ${propertyId}`);

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' },
        { name: 'newUsers' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    });

    const sources = response.rows?.map(row => ({
      channel: row.dimensionValues[0].value,
      sessions: parseInt(row.metricValues[0].value) || 0,
      activeUsers: parseInt(row.metricValues[1].value) || 0,
      newUsers: parseInt(row.metricValues[2].value) || 0,
    })) || [];

    console.log(`✅ Retrieved ${sources.length} traffic sources`);

    return { success: true, sources };
  } catch (error) {
    console.error('❌ Error fetching traffic sources:', error.message);
    return { error: error.message };
  }
};

/**
 * Get top pages
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 */
const getTopPages = async (propertyId, startDate = '30daysAgo', endDate = 'today') => {
  try {
    const client = getAnalyticsClient();
    if (!client) {
      return { error: 'Analytics client not configured' };
    }

    console.log(`📊 Fetching top pages for property ${propertyId}`);

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'averageSessionDuration' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 20,
    });

    const pages = response.rows?.map(row => ({
      path: row.dimensionValues[0].value,
      title: row.dimensionValues[1].value,
      pageViews: parseInt(row.metricValues[0].value) || 0,
      activeUsers: parseInt(row.metricValues[1].value) || 0,
      avgDuration: parseFloat(row.metricValues[2].value) || 0,
    })) || [];

    console.log(`✅ Retrieved ${pages.length} top pages`);

    return { success: true, pages };
  } catch (error) {
    console.error('❌ Error fetching top pages:', error.message);
    return { error: error.message };
  }
};

/**
 * Get geographic data
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 */
const getGeographicData = async (propertyId, startDate = '30daysAgo', endDate = 'today') => {
  try {
    const client = getAnalyticsClient();
    if (!client) {
      return { error: 'Analytics client not configured' };
    }

    console.log(`📊 Fetching geographic data for property ${propertyId}`);

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'country' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
      ],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 15,
    });

    const countries = response.rows?.map(row => ({
      country: row.dimensionValues[0].value,
      activeUsers: parseInt(row.metricValues[0].value) || 0,
      sessions: parseInt(row.metricValues[1].value) || 0,
    })) || [];

    console.log(`✅ Retrieved data for ${countries.length} countries`);

    return { success: true, countries };
  } catch (error) {
    console.error('❌ Error fetching geographic data:', error.message);
    return { error: error.message };
  }
};

/**
 * Get device breakdown
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 */
const getDeviceData = async (propertyId, startDate = '30daysAgo', endDate = 'today') => {
  try {
    const client = getAnalyticsClient();
    if (!client) {
      return { error: 'Analytics client not configured' };
    }

    console.log(`📊 Fetching device data for property ${propertyId}`);

    const [response] = await client.runReport({
      property: `properties/${propertyId}`,
      dateRanges: [{ startDate, endDate }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
    });

    const devices = response.rows?.map(row => ({
      device: row.dimensionValues[0].value,
      activeUsers: parseInt(row.metricValues[0].value) || 0,
      sessions: parseInt(row.metricValues[1].value) || 0,
      pageViews: parseInt(row.metricValues[2].value) || 0,
    })) || [];

    console.log(`✅ Retrieved data for ${devices.length} device types`);

    return { success: true, devices };
  } catch (error) {
    console.error('❌ Error fetching device data:', error.message);
    return { error: error.message };
  }
};

/**
 * Get real-time active users
 * @param {string} propertyId - GA4 Property ID
 */
const getRealTimeUsers = async (propertyId) => {
  try {
    const client = getAnalyticsClient();
    if (!client) {
      return { error: 'Analytics client not configured' };
    }

    console.log(`📊 Fetching real-time users for property ${propertyId}`);

    const [response] = await client.runRealtimeReport({
      property: `properties/${propertyId}`,
      metrics: [{ name: 'activeUsers' }],
    });

    const activeUsers = parseInt(response.rows?.[0]?.metricValues?.[0]?.value) || 0;

    console.log(`✅ Real-time active users: ${activeUsers}`);

    return { success: true, activeUsers };
  } catch (error) {
    console.error('❌ Error fetching real-time users:', error.message);
    return { error: error.message };
  }
};

/**
 * Get comprehensive dashboard data
 * @param {string} propertyId - GA4 Property ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 */
const getDashboardData = async (propertyId, startDate = '30daysAgo', endDate = 'today') => {
  try {
    console.log(`📊 Fetching comprehensive dashboard data for property ${propertyId}`);

    // Fetch all data in parallel
    const [visitorStats, trafficSources, topPages, geoData, deviceData, realTime] = await Promise.all([
      getVisitorStats(propertyId, startDate, endDate),
      getTrafficSources(propertyId, startDate, endDate),
      getTopPages(propertyId, startDate, endDate),
      getGeographicData(propertyId, startDate, endDate),
      getDeviceData(propertyId, startDate, endDate),
      getRealTimeUsers(propertyId),
    ]);

    return {
      success: true,
      propertyId,
      dateRange: { startDate, endDate },
      realTimeUsers: realTime.activeUsers || 0,
      totals: visitorStats.totals || {},
      dailyStats: visitorStats.dailyStats || [],
      trafficSources: trafficSources.sources || [],
      topPages: topPages.pages || [],
      countries: geoData.countries || [],
      devices: deviceData.devices || [],
    };
  } catch (error) {
    console.error('❌ Error fetching dashboard data:', error.message);
    return { error: error.message };
  }
};

module.exports = {
  getVisitorStats,
  getTrafficSources,
  getTopPages,
  getGeographicData,
  getDeviceData,
  getRealTimeUsers,
  getDashboardData,
};
