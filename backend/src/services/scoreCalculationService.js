// Score Calculation Service
// Calculates audit scores based on Google metrics + actual crawled issues
// Ensures scores reflect REAL SEO problems, not just page speed

/**
 * Calculate audit scores based on Google metrics + detected issues
 * Deducts points from Google scores based on actual SEO issues found
 * @param {number} googleOnPageScore - Score from Google PageSpeed
 * @param {number} googleTechnicalScore - Score from Google PageSpeed
 * @param {number} googleContentScore - Score from Google PageSpeed
 * @param {array} issues - Array of SEO issues detected by crawler
 * @returns {object} Adjusted scores
 */
const calculateScoresFromIssues = (googleOnPageScore, googleTechnicalScore, googleContentScore, issues = []) => {
  // Start with Google scores
  let onPageScore = googleOnPageScore;
  let technicalScore = googleTechnicalScore;
  let contentScore = googleContentScore;

  if (!issues || issues.length === 0) {
    // No issues found = keep full scores
    return {
      onPageScore: Math.round(onPageScore),
      technicalScore: Math.round(technicalScore),
      contentScore: Math.round(contentScore),
    };
  }

  // Categorize issues and calculate deductions
  const issuesByCategory = categorizeIssues(issues);

  // ON-PAGE SCORE deductions
  // Affected by: meta descriptions, H1 tags, keyword optimization
  const onPageDeductions = calculateOnPageDeductions(issuesByCategory);
  onPageScore = Math.max(0, onPageScore - onPageDeductions);

  // TECHNICAL SCORE deductions
  // Affected by: site structure, broken links, crawlability
  const technicalDeductions = calculateTechnicalDeductions(issuesByCategory);
  technicalScore = Math.max(0, technicalScore - technicalDeductions);

  // CONTENT SCORE deductions
  // Affected by: alt tags, readability, content quality
  const contentDeductions = calculateContentDeductions(issuesByCategory);
  contentScore = Math.max(0, contentScore - contentDeductions);

  console.log(`📊 Score Deductions:`);
  console.log(`   - On-Page: -${onPageDeductions} (${issuesByCategory.onPage.length} issues)`);
  console.log(`   - Technical: -${technicalDeductions} (${issuesByCategory.technical.length} issues)`);
  console.log(`   - Content: -${contentDeductions} (${issuesByCategory.content.length} issues)`);

  return {
    onPageScore: Math.round(onPageScore),
    technicalScore: Math.round(technicalScore),
    contentScore: Math.round(contentScore),
  };
};

/**
 * Categorize issues by type
 */
const categorizeIssues = (issues) => {
  const categories = {
    onPage: [],    // Meta descriptions, H1 tags, title tags
    technical: [], // Broken links, crawlability, site structure
    content: [],   // Alt tags, images, readability
  };

  issues.forEach((issue) => {
    const issueText = (issue.issue || '').toLowerCase();

    // ON-PAGE ISSUES
    if (
      issueText.includes('meta description') ||
      issueText.includes('h1 tag') ||
      issueText.includes('title tag') ||
      issueText.includes('keyword')
    ) {
      categories.onPage.push(issue);
    }

    // TECHNICAL ISSUES
    else if (
      issueText.includes('broken') ||
      issueText.includes('link') ||
      issueText.includes('redirect') ||
      issueText.includes('crawl') ||
      issueText.includes('structure')
    ) {
      categories.technical.push(issue);
    }

    // CONTENT ISSUES
    else if (
      issueText.includes('alt tag') ||
      issueText.includes('alt text') ||
      issueText.includes('image') ||
      issueText.includes('content') ||
      issueText.includes('text')
    ) {
      categories.content.push(issue);
    }

    // Default to on-page if unclear
    else {
      categories.onPage.push(issue);
    }
  });

  return categories;
};

/**
 * Calculate on-page score deductions
 * Missing meta descriptions: -15 points each (max -30)
 * Missing H1 tags: -10 points each (max -25)
 * Other on-page issues: -5 points each
 */
const calculateOnPageDeductions = (issuesByCategory) => {
  let deduction = 0;

  const criticalIssues = issuesByCategory.onPage.filter((i) => i.severity === 'critical' || i.severity === 'high');
  const mediumIssues = issuesByCategory.onPage.filter((i) => i.severity === 'medium');
  const lowIssues = issuesByCategory.onPage.filter((i) => i.severity === 'low');

  // Critical/High severity issues: -15 points each (max -30)
  deduction += Math.min(criticalIssues.length * 15, 30);

  // Medium severity: -10 points each (max -20)
  deduction += Math.min(mediumIssues.length * 10, 20);

  // Low severity: -3 points each (max -10)
  deduction += Math.min(lowIssues.length * 3, 10);

  return deduction;
};

/**
 * Calculate technical score deductions
 * Broken links: -20 points each (max -30)
 * Crawl issues: -15 points each (max -25)
 * Structure issues: -10 points each
 */
const calculateTechnicalDeductions = (issuesByCategory) => {
  let deduction = 0;

  const criticalIssues = issuesByCategory.technical.filter((i) => i.severity === 'critical' || i.severity === 'high');
  const mediumIssues = issuesByCategory.technical.filter((i) => i.severity === 'medium');
  const lowIssues = issuesByCategory.technical.filter((i) => i.severity === 'low');

  // Critical/High severity issues: -20 points each (max -40)
  deduction += Math.min(criticalIssues.length * 20, 40);

  // Medium severity: -10 points each (max -20)
  deduction += Math.min(mediumIssues.length * 10, 20);

  // Low severity: -5 points each (max -10)
  deduction += Math.min(lowIssues.length * 5, 10);

  return deduction;
};

/**
 * Calculate content score deductions
 * Missing alt tags: -5 points per image (max -30)
 * Image issues: -3 points each
 * Content quality: -10 points
 */
const calculateContentDeductions = (issuesByCategory) => {
  let deduction = 0;

  const criticalIssues = issuesByCategory.content.filter((i) => i.severity === 'critical' || i.severity === 'high');
  const mediumIssues = issuesByCategory.content.filter((i) => i.severity === 'medium');
  const lowIssues = issuesByCategory.content.filter((i) => i.severity === 'low');

  // Count missing alt tags specifically
  const missingAltIssues = issuesByCategory.content.filter((i) =>
    i.issue && i.issue.toLowerCase().includes('alt tag')
  );

  // Missing alt tags: -3 points per issue (max -25)
  deduction += Math.min(missingAltIssues.length * 3, 25);

  // Critical/High severity issues: -15 points each (max -30)
  const otherCritical = criticalIssues.filter((i) => !i.issue.toLowerCase().includes('alt tag'));
  deduction += Math.min(otherCritical.length * 15, 30);

  // Medium severity: -8 points each (max -20)
  const otherMedium = mediumIssues.filter((i) => !i.issue.toLowerCase().includes('alt tag'));
  deduction += Math.min(otherMedium.length * 8, 20);

  // Low severity: -3 points each (max -10)
  deduction += Math.min(lowIssues.length * 3, 10);

  return deduction;
};

module.exports = {
  calculateScoresFromIssues,
};
