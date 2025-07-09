/**
 * NewsAPI Processing Template
 * Processes and normalizes NewsAPI responses for the newsletter workflow
 */

/**
 * Process NewsAPI results into standardized format
 * @param {Object} input - n8n input data
 * @returns {Array} Normalized articles
 */
function processNewsAPI(input) {
  const articles = [];
  
  try {
    const responseData = input.first().json;
    
    // Check if we have articles in the response
    if (!responseData.articles || !Array.isArray(responseData.articles)) {
      console.warn('No articles found in NewsAPI response');
      return [];
    }
    
    // Process each article
    for (const article of responseData.articles) {
      // Skip invalid articles
      if (!isValidArticle(article)) {
        continue;
      }
      
      // Create normalized article object
      const normalizedArticle = {
        title: cleanTitle(article.title),
        description: cleanDescription(article.description),
        url: article.url,
        source: article.source?.name || 'Unknown Source',
        publishedAt: article.publishedAt || new Date().toISOString(),
        content: article.content || article.description || '',
        type: 'news',
        needsExtraction: true,
        originalData: {
          author: article.author,
          urlToImage: article.urlToImage,
          sourceDomain: extractDomain(article.url)
        }
      };
      
      // Add relevance indicators
      normalizedArticle.relevanceFlags = calculateRelevanceFlags(normalizedArticle);
      
      articles.push(normalizedArticle);
    }
    
    console.log(`Processed ${articles.length} articles from NewsAPI`);
    
  } catch (error) {
    console.error('Error processing NewsAPI response:', error);
    return [];
  }
  
  return articles.map(article => ({ json: article }));
}

/**
 * Validate if article has required fields
 * @param {Object} article - Article from NewsAPI
 * @returns {boolean} Is valid article
 */
function isValidArticle(article) {
  // Must have title and URL
  if (!article.title || !article.url) {
    return false;
  }
  
  // Skip removed articles
  if (article.url.includes('[Removed]') || 
      article.title.includes('[Removed]')) {
    return false;
  }
  
  // Skip articles with no content
  if (!article.description && !article.content) {
    return false;
  }
  
  // Check for minimum content length
  const contentLength = (article.description || '').length + (article.content || '').length;
  if (contentLength < 50) {
    return false;
  }
  
  return true;
}

/**
 * Clean and normalize article title
 * @param {string} title - Raw title
 * @returns {string} Cleaned title
 */
function cleanTitle(title) {
  if (!title) return '';
  
  return title
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/^\s+|\s+$/g, '')      // Trim
    .replace(/&quot;/g, '"')        // Fix HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .slice(0, 200);                 // Limit length
}

/**
 * Clean and normalize article description
 * @param {string} description - Raw description
 * @returns {string} Cleaned description
 */
function cleanDescription(description) {
  if (!description) return '';
  
  return description
    .replace(/\s+/g, ' ')           // Normalize whitespace
    .replace(/^\s+|\s+$/g, '')      // Trim
    .replace(/&quot;/g, '"')        // Fix HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\[.*?\]/g, '')        // Remove [content] markers
    .slice(0, 500);                 // Limit length
}

/**
 * Extract domain from URL
 * @param {string} url - Article URL
 * @returns {string} Domain name
 */
function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/**
 * Calculate relevance flags for content scoring
 * @param {Object} article - Normalized article
 * @returns {Object} Relevance flags
 */
function calculateRelevanceFlags(article) {
  const content = (article.title + ' ' + article.description).toLowerCase();
  
  const aiKeywords = [
    'ai', 'artificial intelligence', 'machine learning', 'deep learning',
    'neural', 'robot', 'automation', 'algorithm', 'chatgpt', 'openai',
    '人工知能', 'ロボット', 'AI技術'
  ];
  
  const japanKeywords = [
    'japan', 'tokyo', 'japanese', 'nippon', 'nihon',
    '日本', '東京', '大阪', '京都', 'ソニー', 'トヨタ', 'ソフトバンク'
  ];
  
  const techKeywords = [
    'technology', 'innovation', 'startup', 'research', 'development',
    'university', 'company', 'investment', 'funding'
  ];
  
  return {
    hasAIKeywords: aiKeywords.some(keyword => content.includes(keyword)),
    hasJapanKeywords: japanKeywords.some(keyword => content.includes(keyword)),
    hasTechKeywords: techKeywords.some(keyword => content.includes(keyword)),
    isRecent: isRecentArticle(article.publishedAt),
    hasImage: !!article.originalData.urlToImage,
    sourceQuality: assessSourceQuality(article.source, article.originalData.sourceDomain)
  };
}

/**
 * Check if article is recent (within last 2 days)
 * @param {string} publishedAt - Publication timestamp
 * @returns {boolean} Is recent
 */
function isRecentArticle(publishedAt) {
  try {
    const publishDate = new Date(publishedAt);
    const twoDaysAgo = new Date(Date.now() - (2 * 24 * 60 * 60 * 1000));
    return publishDate > twoDaysAgo;
  } catch {
    return false;
  }
}

/**
 * Assess source quality based on known sources
 * @param {string} sourceName - Source name
 * @param {string} domain - Source domain
 * @returns {string} Quality level
 */
function assessSourceQuality(sourceName, domain) {
  const premiumSources = [
    'reuters', 'bloomberg', 'nikkei', 'japan times', 'techcrunch',
    'venturebeat', 'wired', 'ars technica', 'the verge', 'engadget'
  ];
  
  const name = sourceName.toLowerCase();
  const domainLower = domain.toLowerCase();
  
  if (premiumSources.some(source => 
    name.includes(source) || domainLower.includes(source))) {
    return 'high';
  }
  
  // Check for academic or research sources
  if (domainLower.includes('edu') || domainLower.includes('research') ||
      name.includes('university') || name.includes('institute')) {
    return 'high';
  }
  
  // Check for established tech publications
  const establishedSources = [
    'cnet', 'zdnet', 'computerworld', 'infoworld', 'pcworld',
    'ieee', 'acm', 'science', 'nature'
  ];
  
  if (establishedSources.some(source => 
    name.includes(source) || domainLower.includes(source))) {
    return 'medium';
  }
  
  return 'low';
}

/**
 * Filter articles by quality and relevance
 * @param {Array} articles - Processed articles
 * @param {Object} config - Filtering configuration
 * @returns {Array} Filtered articles
 */
function filterArticles(articles, config = {}) {
  const {
    minRelevanceScore = 0.5,
    requireAIKeywords = false,
    requireJapanKeywords = false,
    maxAge = 7 // days
  } = config;
  
  return articles.filter(article => {
    const flags = article.relevanceFlags;
    
    // Calculate simple relevance score
    let score = 0;
    if (flags.hasAIKeywords) score += 0.3;
    if (flags.hasJapanKeywords) score += 0.3;
    if (flags.hasTechKeywords) score += 0.1;
    if (flags.isRecent) score += 0.2;
    if (flags.sourceQuality === 'high') score += 0.1;
    
    // Apply filters
    if (score < minRelevanceScore) return false;
    if (requireAIKeywords && !flags.hasAIKeywords) return false;
    if (requireJapanKeywords && !flags.hasJapanKeywords) return false;
    
    return true;
  });
}

module.exports = {
  processNewsAPI,
  isValidArticle,
  cleanTitle,
  cleanDescription,
  calculateRelevanceFlags,
  filterArticles
}; 