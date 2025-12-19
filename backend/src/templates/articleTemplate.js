/**
 * Article HTML Template Builder
 * Generates SEO-optimized HTML articles matching BablyloveGrowth format
 */

/**
 * Generate Schema.org JSON-LD structured data
 * @param {object} article - Article data
 * @param {object} websiteInfo - Website information
 * @returns {object} Schema.org Article object
 */
const generateSchemaOrg = (article, websiteInfo) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.metaDescription,
    image: article.heroImage
      ? {
          '@type': 'ImageObject',
          url: article.heroImage,
          description: article.heroImageAlt || article.title,
        }
      : undefined,
    author: {
      '@type': 'Organization',
      name: websiteInfo.websiteName || websiteInfo.domain,
      url: websiteInfo.targetUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: websiteInfo.websiteName || websiteInfo.domain,
      url: websiteInfo.targetUrl,
    },
    datePublished: new Date().toISOString(),
    inLanguage: 'en',
    articleBody: article.metaDescription,
  };
};

/**
 * Generate slug from text
 * @param {string} text - Text to convert to slug
 * @returns {string} URL-safe slug
 */
const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
};

/**
 * Embedded CSS styles matching BablyloveGrowth format
 */
const getEmbeddedStyles = () => `
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    line-height: 1.6;
    color: #333;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
  }
  h1, h2, h3, h4, h5, h6 {
    color: #2c3e50;
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }
  h1 { font-size: 2.5em; }
  h2 { font-size: 2em; }
  h3 { font-size: 1.5em; }
  h4 { font-size: 1.25em; }
  h5 { font-size: 1.1em; }
  h6 { font-size: 1em; }
  p {
    margin-bottom: 1em;
  }
  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em auto;
  }
  a {
    color: #3498db;
    text-decoration: none;
  }
  a:hover {
    text-decoration: underline;
  }
  blockquote {
    border-left: 4px solid #3498db;
    margin: 1em 0;
    padding-left: 1em;
    color: #666;
  }
  code {
    background-color: #f8f9fa;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
  }
  pre {
    background-color: #f8f9fa;
    padding: 1em;
    border-radius: 5px;
    overflow-x: auto;
  }
  ul, ol {
    margin-bottom: 1em;
    padding-left: 2em;
  }
  li {
    margin-bottom: 0.5em;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
  }
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  th {
    background-color: #f2f2f2;
  }
  .pro-tip {
    background-color: #e8f4fd;
    border-left: 4px solid #3498db;
    padding: 1em;
    margin: 1.5em 0;
    border-radius: 0 5px 5px 0;
  }
  .pro-tip strong {
    color: #2980b9;
  }
  .cta-section {
    background-color: #f8f9fa;
    padding: 2em;
    margin: 2em 0;
    border-radius: 8px;
    text-align: center;
  }
  .cta-section h2 {
    margin-top: 0;
  }
  .faq-item {
    margin-bottom: 1.5em;
  }
  .faq-item h4 {
    margin-bottom: 0.5em;
    color: #2c3e50;
  }
`;

/**
 * Build Table of Contents HTML
 * @param {array} sections - Array of section objects with headings
 * @returns {string} HTML for table of contents
 */
const buildTableOfContents = (sections) => {
  const items = sections
    .map((section) => {
      const slug = generateSlug(section.heading);
      return `<li><a href="#${slug}" rel="nofollow">${section.heading}</a></li>`;
    })
    .join('\n      ');

  return `
    <h2 id="table-of-contents" tabindex="-1">Table of Contents</h2>
    <ul>
      ${items}
    </ul>`;
};

/**
 * Build Key Takeaways table HTML
 * @param {array} takeaways - Array of takeaway objects with point and details
 * @returns {string} HTML for key takeaways table
 */
const buildKeyTakeaways = (takeaways) => {
  const rows = takeaways
    .map(
      (item, index) => `
      <tr>
        <td><strong>${index + 1}. ${item.point}</strong></td>
        <td>${item.details}</td>
      </tr>`
    )
    .join('');

  return `
    <h2 id="key-takeaways" tabindex="-1">Key Takeaways</h2>
    <table>
      <thead>
        <tr>
          <th>Key Point</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>`;
};

/**
 * Build main content sections HTML
 * @param {array} sections - Array of section objects
 * @returns {string} HTML for all content sections
 */
const buildSections = (sections) => {
  return sections
    .map((section, index) => {
      const slug = generateSlug(section.heading);
      let sectionHtml = `
    <h2 id="${slug}" tabindex="-1">${section.heading}</h2>
    ${section.content
      .split('\n\n')
      .map((para) => `<p>${para}</p>`)
      .join('\n    ')}`;

      // Add pro tip if exists
      if (section.proTip) {
        sectionHtml += `
    <div class="pro-tip">
      <strong>Pro Tip:</strong> ${section.proTip}
    </div>`;
      }

      // Add mid-article image if provided
      if (section.image) {
        sectionHtml += `
    <p><img src="${section.image}" alt="${section.imageAlt || section.heading}"></p>`;
      }

      return sectionHtml;
    })
    .join('\n');
};

/**
 * Build Call-to-Action section HTML
 * @param {object} cta - CTA object with heading and content
 * @param {object} websiteInfo - Website information
 * @returns {string} HTML for CTA section
 */
const buildCallToAction = (cta, websiteInfo) => {
  const ctaImage = websiteInfo.ctaImage || '';
  const imageHtml = ctaImage
    ? `<p><img src="${ctaImage}" alt="${websiteInfo.websiteName || websiteInfo.domain}"></p>`
    : '';

  return `
    <div class="cta-section">
      <h2 id="cta" tabindex="-1">${cta.heading}</h2>
      ${imageHtml}
      <p>${cta.content}</p>
      <p><a href="${websiteInfo.targetUrl}"><strong>Visit ${websiteInfo.websiteName || websiteInfo.domain}</strong></a> to get started today!</p>
    </div>`;
};

/**
 * Build FAQ section HTML
 * @param {array} faqs - Array of FAQ objects with question and answer
 * @returns {string} HTML for FAQ section
 */
const buildFaqSection = (faqs) => {
  const faqItems = faqs
    .map((faq) => {
      const slug = generateSlug(faq.question);
      return `
    <div class="faq-item">
      <h4 id="${slug}" tabindex="-1">${faq.question}</h4>
      <p>${faq.answer}</p>
    </div>`;
    })
    .join('');

  return `
    <h2 id="frequently-asked-questions" tabindex="-1">Frequently Asked Questions</h2>
    ${faqItems}`;
};

/**
 * Build Recommended Links section HTML
 * @param {array} links - Array of link objects with title and url
 * @param {object} websiteInfo - Website information
 * @returns {string} HTML for recommended links
 */
const buildRecommendedLinks = (links, websiteInfo) => {
  // Add website's main pages if not already included
  const defaultLinks = [
    { title: `${websiteInfo.websiteName || websiteInfo.domain} - Home`, url: websiteInfo.targetUrl },
  ];

  const allLinks = [...defaultLinks, ...links];

  const linkItems = allLinks
    .map((link) => `<li><a href="${link.url}">${link.title}</a></li>`)
    .join('\n      ');

  return `
    <h2 id="recommended" tabindex="-1">Recommended</h2>
    <ul>
      ${linkItems}
    </ul>`;
};

/**
 * Main function to generate complete article HTML
 * @param {object} article - Article content object from AI generation
 * @param {object} websiteInfo - Website/campaign information
 * @returns {string} Complete HTML document
 */
const generateArticleHtml = (article, websiteInfo) => {
  const schemaOrg = generateSchemaOrg(article, websiteInfo);

  const heroImageHtml = article.heroImage
    ? `<p><img src="${article.heroImage}" alt="${article.heroImageAlt || article.title}"></p>`
    : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${article.title}</title>
    <meta name="description" content="${article.metaDescription}">
    <style>
      ${getEmbeddedStyles()}
    </style>
</head>
<body>
    <article>
        <script type="application/ld+json">
${JSON.stringify(schemaOrg, null, 2)}
        </script>

    <h1 id="${generateSlug(article.title)}" tabindex="-1">${article.title}</h1>
    ${heroImageHtml}
    <p>${article.openingParagraph}</p>
    ${buildTableOfContents(article.sections)}
    ${buildKeyTakeaways(article.keyTakeaways)}
    ${buildSections(article.sections)}
    ${buildCallToAction(article.callToAction, websiteInfo)}
    ${buildFaqSection(article.faq)}
    ${buildRecommendedLinks(article.recommendedLinks || [], websiteInfo)}

    </article>
</body>
</html>`;

  return html;
};

/**
 * Calculate word count from HTML content
 * @param {string} html - HTML content
 * @returns {number} Word count
 */
const calculateWordCount = (html) => {
  // Strip HTML tags and count words
  const textContent = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return textContent.split(' ').filter((word) => word.length > 0).length;
};

module.exports = {
  generateArticleHtml,
  generateSchemaOrg,
  generateSlug,
  calculateWordCount,
  buildTableOfContents,
  buildKeyTakeaways,
  buildSections,
  buildCallToAction,
  buildFaqSection,
  buildRecommendedLinks,
};
