/**
 * RSS Processing Template
 * Processes RSS feed XML data for the newsletter workflow
 */

/**
 * Process RSS feed XML into standardized format
 * @param {Object} input - n8n input data
 * @returns {Array} Normalized articles
 */
function processRSS(input) {
  const articles = [];
  
  try {
    const rssData = input.first().json;
    const sourceInfo = {
      source: rssData.source || 'RSS Feed',
      category: rssData.category || 'general',
      priority: rssData.priority || 'medium'
    };
    
    // Handle different response formats
    let xmlContent;
    if (typeof rssData === 'string') {
      xmlContent = rssData;
    } else if (rssData.data) {
      xmlContent = rssData.data;
    } else if (rssData.body) {
      xmlContent = rssData.body;
    } else {
      console.warn('Unable to find XML content in RSS response');
      return [];
    }
    
    // Parse RSS items from XML
    const items = parseRSSItems(xmlContent);
    
    // Process each item
    for (const item of items) {
      const normalizedArticle = normalizeRSSItem(item, sourceInfo);
      
      if (normalizedArticle && isRelevantArticle(normalizedArticle)) {
        articles.push(normalizedArticle);
      }
    }
    
    console.log(`Processed ${articles.length} articles from RSS feed: ${sourceInfo.source}`);
    
  } catch (error) {
    console.error('Error processing RSS feed:', error);
    return [];
  }
  
  return articles.slice(0, 10).map(article => ({ json: article }));
}

/**
 * Parse RSS items from XML content
 * @param {string} xmlContent - RSS XML content
 * @returns {Array} Parsed RSS items
 */
function parseRSSItems(xmlContent) {
  const items = [];
  
  try {
    // Extract items using regex (simple XML parsing)
    const itemMatches = xmlContent.match(/<item>[\s\S]*?<\/item>/gi) || [];
    
    for (const itemXml of itemMatches) {
      const item = parseRSSItem(itemXml);
      if (item) {
        items.push(item);
      }
    }
    
  } catch (error) {
    console.error('Error parsing RSS XML:', error);
  }
  
  return items;
}

/**
 * Parse individual RSS item
 * @param {string} itemXml - RSS item XML
 * @returns {Object} Parsed item data
 */
function parseRSSItem(itemXml) {
  try {
    const item = {};
    
    // Extract title
    const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/is);
    item.title = titleMatch ? cleanXMLContent(titleMatch[1]) : '';
    
    // Extract link
    const linkMatch = itemXml.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/is);
    item.link = linkMatch ? cleanXMLContent(linkMatch[1]).trim() : '';
    
    // Extract description
    const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/is);
    item.description = descMatch ? cleanXMLContent(descMatch[1]) : '';
    
    // Extract publication date
    const pubDateMatch = itemXml.match(/<pubDate>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/pubDate>/is);
    item.pubDate = pubDateMatch ? cleanXMLContent(pubDateMatch[1]) : '';
    
    // Alternative date formats
    if (!item.pubDate) {
      const dateMatch = itemXml.match(/<dc:date>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/dc:date>/is);
      item.pubDate = dateMatch ? cleanXMLContent(dateMatch[1]) : '';
    }
    
    // Extract author if available
    const authorMatch = itemXml.match(/<(?:dc:)?(?:author|creator)>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/(?:dc:)?(?:author|creator)>/is);
    item.author = authorMatch ? cleanXMLContent(authorMatch[1]) : '';
    
    // Extract category/tags
    const categoryMatches = itemXml.match(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/gis) || [];
    item.categories = categoryMatches.map(match => {
      const categoryMatch = match.match(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/is);
      return categoryMatch ? cleanXMLContent(categoryMatch[1]) : '';
    }).filter(cat => cat);
    
    return item;
    
  } catch (error) {
    console.error('Error parsing RSS item:', error);
    return null;
  }
}

/**
 * Clean XML content (remove CDATA, decode entities, etc.)
 * @param {string} content - Raw XML content
 * @returns {string} Cleaned content
 */
function cleanXMLContent(content) {
  if (!content) return '';
  
  return content
    .replace(/<!CDATA\[|\]\]>/g, '')     // Remove CDATA markers
    .replace(/&lt;/g, '<')              // Decode HTML entities
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]*>/g, '')            // Remove HTML tags
    .replace(/\s+/g, ' ')               // Normalize whitespace
    .trim();
}

/**
 * Normalize RSS item to standard article format
 * @param {Object} item - Parsed RSS item
 * @param {Object} sourceInfo - Source metadata
 * @returns {Object} Normalized article
 */
function normalizeRSSItem(item, sourceInfo) {
  if (!item.title || !item.link) {
    return null;
  }
  
  // Parse and validate publication date
  let publishedAt;
  try {
    publishedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
  } catch {
    publishedAt = new Date().toISOString();
  }
  
  const article = {
    title: item.title.slice(0, 200),
    description: item.description.slice(0, 500),
    url: item.link,
    source: sourceInfo.source,
    publishedAt: publishedAt,
    content: item.description || '',
    type: 'rss',
    needsExtraction: true,
    originalData: {
      author: item.author,
      categories: item.categories,
      sourceCategory: sourceInfo.category,
      priority: sourceInfo.priority
    }
  };
  
  // Add relevance scoring
  article.relevanceFlags = calculateRSSRelevance(article);
  
  return article;
}

/**
 * Check if article is relevant to AI/Japan topics
 * @param {Object} article - Normalized article
 * @returns {boolean} Is relevant
 */
function isRelevantArticle(article) {
  const content = (article.title + ' ' + article.description).toLowerCase();
  
  // AI-related keywords
  const aiKeywords = [
    'ai', 'artificial intelligence', 'machine learning', 'deep learning',
    'neural', 'robot', 'automation', 'chatgpt', 'openai', 'algorithm',
    '人工知能', 'ロボット', 'AI技術', 'ml', 'dl'
  ];
  
  // Japan-related keywords
  const japanKeywords = [
    'japan', 'tokyo', 'japanese', 'nippon', 'nihon', 'osaka', 'kyoto',
    '日本', '東京', '大阪', '京都', 'sony', 'toyota', 'softbank',
    'ソニー', 'トヨタ', 'ソフトバンク'
  ];
  
  // Tech-related keywords for broader relevance
  const techKeywords = [
    'technology', 'innovation', 'startup', 'research', 'development',
    'semiconductor', 'chip', 'processor', 'quantum', 'blockchain'
  ];
  
  const hasAI = aiKeywords.some(keyword => content.includes(keyword));
  const hasJapan = japanKeywords.some(keyword => content.includes(keyword));
  const hasTech = techKeywords.some(keyword => content.includes(keyword));
  
  // Article is relevant if it mentions AI OR (Japan AND Tech)
  return hasAI || (hasJapan && hasTech);
}

/**
 * Calculate relevance flags for RSS articles
 * @param {Object} article - Normalized article
 * @returns {Object} Relevance flags
 */
function calculateRSSRelevance(article) {
  const content = (article.title + ' ' + article.description).toLowerCase();
  
  const aiKeywords = [
    'ai', 'artificial intelligence', 'machine learning', 'deep learning',
    'neural', 'robot', 'automation', '人工知能', 'ロボット'
  ];
  
  const japanKeywords = [
    'japan', 'tokyo', 'japanese', '日本', '東京', 'sony', 'toyota'
  ];
  
  const techKeywords = [
    'technology', 'innovation', 'startup', 'research', 'development'
  ];
  
  const hasAI = aiKeywords.some(keyword => content.includes(keyword));
  const hasJapan = japanKeywords.some(keyword => content.includes(keyword));
  const hasTech = techKeywords.some(keyword => content.includes(keyword));
  
  // Check recency (within last 3 days for RSS)
  const isRecent = isRecentRSSArticle(article.publishedAt);
  
  // Assess content quality
  const hasGoodLength = (article.title.length + article.description.length) > 100;
  const hasCategories = article.originalData.categories.length > 0;
  
  return {
    hasAIKeywords: hasAI,
    hasJapanKeywords: hasJapan,
    hasTechKeywords: hasTech,
    isRecent: isRecent,
    hasGoodLength: hasGoodLength,
    hasCategories: hasCategories,
    sourceQuality: assessRSSSourceQuality(article.source, article.originalData.priority)
  };
}

/**
 * Check if RSS article is recent
 * @param {string} publishedAt - Publication timestamp
 * @returns {boolean} Is recent
 */
function isRecentRSSArticle(publishedAt) {
  try {
    const publishDate = new Date(publishedAt);
    const threeDaysAgo = new Date(Date.now() - (3 * 24 * 60 * 60 * 1000));
    return publishDate > threeDaysAgo;
  } catch {
    return false;
  }
}

/**
 * Assess RSS source quality
 * @param {string} sourceName - Source name
 * @param {string} priority - Configured priority
 * @returns {string} Quality assessment
 */
function assessRSSSourceQuality(sourceName, priority) {
  // Use configured priority as base
  if (priority === 'high') return 'high';
  if (priority === 'low') return 'low';
  
  // Additional quality indicators
  const name = sourceName.toLowerCase();
  
  const premiumIndicators = [
    'times', 'nikkei', 'reuters', 'bloomberg', 'techcrunch',
    'university', 'research', 'institute', 'academic'
  ];
  
  if (premiumIndicators.some(indicator => name.includes(indicator))) {
    return 'high';
  }
  
  return 'medium';
}

/**
 * Filter and rank RSS articles
 * @param {Array} articles - Processed articles
 * @param {Object} config - Filtering configuration
 * @returns {Array} Filtered and ranked articles
 */
function filterRSSArticles(articles, config = {}) {
  const {
    maxArticles = 10,
    minContentLength = 100,
    requireRelevance = true
  } = config;
  
  let filtered = articles;
  
  // Filter by content length
  filtered = filtered.filter(article => 
    (article.title.length + article.description.length) >= minContentLength
  );
  
  // Filter by relevance if required
  if (requireRelevance) {
    filtered = filtered.filter(article => {
      const flags = article.relevanceFlags;
      return flags.hasAIKeywords || (flags.hasJapanKeywords && flags.hasTechKeywords);
    });
  }
  
  // Sort by relevance score
  filtered.sort((a, b) => {
    const scoreA = calculateRSSScore(a);
    const scoreB = calculateRSSScore(b);
    return scoreB - scoreA;
  });
  
  return filtered.slice(0, maxArticles);
}

/**
 * Calculate overall score for RSS article
 * @param {Object} article - Article to score
 * @returns {number} Relevance score
 */
function calculateRSSScore(article) {
  const flags = article.relevanceFlags;
  let score = 0;
  
  if (flags.hasAIKeywords) score += 3;
  if (flags.hasJapanKeywords) score += 2;
  if (flags.hasTechKeywords) score += 1;
  if (flags.isRecent) score += 2;
  if (flags.hasGoodLength) score += 1;
  if (flags.sourceQuality === 'high') score += 2;
  if (flags.sourceQuality === 'medium') score += 1;
  
  return score;
}

module.exports = {
  processRSS,
  parseRSSItems,
  parseRSSItem,
  cleanXMLContent,
  normalizeRSSItem,
  isRelevantArticle,
  calculateRSSRelevance,
  filterRSSArticles
}; 