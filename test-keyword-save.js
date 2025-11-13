/**
 * Test script to verify keywords are being saved during audit
 */

require('dotenv').config({ path: './backend/.env' });
const { performSEOAudit } = require('./backend/src/services/seoService');

async function testKeywordSave() {
  console.log('\n========================================');
  console.log('🧪 Testing Keyword Save During Audit');
  console.log('========================================\n');

  try {
    console.log('🌐 Testing with domain: taskquadrant.io');
    console.log('📌 Keywords: Task Management, Task Priority, Task Manager\n');

    const auditData = await performSEOAudit(
      'https://taskquadrant.io',
      'Task Management, Task Priority, Task Manager'
    );

    console.log('\n========================================');
    console.log('📊 Audit Results:');
    console.log('========================================\n');

    console.log('✅ Google PageSpeed Score:', auditData.overallScore);
    console.log('✅ Core Web Vitals - LCP:', auditData.coreWebVitals?.largestContentfulPaint, 'ms');

    if (auditData.keywordData && auditData.keywordData.length > 0) {
      console.log(`\n✅ Keywords Found: ${auditData.keywordData.length}`);
      console.log('\nKeyword Data:');
      auditData.keywordData.forEach((kw, idx) => {
        console.log(`\n${idx + 1}. "${kw.keyword}"`);
        console.log(`   Search Volume: ${kw.searchVolume}`);
        console.log(`   Difficulty: ${kw.difficulty}/100`);
        console.log(`   Current Position: ${kw.currentPosition}`);
        console.log(`   Trend: ${kw.trend}`);
        console.log(`   Is Real: ${kw.isFromRealAPI ? 'Yes (Serper)' : 'No (Mock)'}`);
      });

      console.log('\n========================================');
      console.log('✅ SUCCESS: Keywords are ready to be saved!');
      console.log('========================================\n');
    } else {
      console.log('\n❌ No keywords found in audit data\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testKeywordSave().catch(console.error);
