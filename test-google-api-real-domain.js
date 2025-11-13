/**
 * Test script with real domains to verify API accuracy
 */

require('dotenv').config({ path: './backend/.env' });
const { getGooglePageSpeedMetrics } = require('./backend/src/services/googleService');

async function testMultipleDomains() {
  const domains = [
    'example.com',
    'google.com',
    'github.com',
    'amazon.com',
  ];

  console.log('\n========================================');
  console.log('🧪 Testing Google PageSpeed API with Multiple Domains');
  console.log('========================================\n');

  for (const domain of domains) {
    try {
      console.log(`\n🌐 Testing: ${domain}`);
      const result = await getGooglePageSpeedMetrics(domain, 'mobile');

      console.log(`   Performance: ${result.performanceScore}`);
      console.log(`   Overall: ${result.overallScore}`);
      console.log(`   isReal: ${result.isReal}`);
      console.log(`   LCP: ${result.coreWebVitals?.largestContentfulPaint}ms`);
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }

    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n========================================');
  console.log('✅ Test completed');
  console.log('========================================\n');
}

testMultipleDomains().catch(console.error);
