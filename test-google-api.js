/**
 * Test script to verify if Google API is being called
 * Run from root directory: node test-google-api.js
 */

require('dotenv').config({ path: './backend/.env' });
const { getGooglePageSpeedMetrics } = require('./backend/src/services/googleService');

async function testGoogleAPI() {
  console.log('\n========================================');
  console.log('🧪 Testing Google PageSpeed API');
  console.log('========================================\n');

  console.log('📋 Environment Check:');
  console.log('API Key exists:', !!process.env.GOOGLE_PAGESPEED_API_KEY);
  console.log('API Key value:', process.env.GOOGLE_PAGESPEED_API_KEY?.substring(0, 10) + '...');
  console.log('');

  try {
    console.log('🌐 Testing with domain: example.com');
    const result = await getGooglePageSpeedMetrics('example.com', 'mobile');

    console.log('\n========================================');
    console.log('📊 Result:');
    console.log('========================================');
    console.log('isReal:', result.isReal);
    console.log('Performance Score:', result.performanceScore);
    console.log('Overall Score:', result.overallScore);
    console.log('');

    if (result.isReal === true) {
      console.log('✅ SUCCESS: Got REAL data from Google API');
    } else {
      console.log('⚠️  WARNING: Got MOCK data (NOT from Google API)');
    }

    console.log('\n========================================');
    console.log('Full Response:');
    console.log('========================================');
    console.log(JSON.stringify(result, null, 2).substring(0, 500) + '...');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testGoogleAPI();
