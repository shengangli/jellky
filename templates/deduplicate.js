/**
 * Article Deduplication Template
 * Removes duplicate articles using URL and title similarity matching
 */

/**
 * Deduplicate articles from multiple sources
 * @param {Object} input - n8n input data (all articles from merge)
 * @param {Object} vars - n8n environment variables
 * @returns {Array} Deduplicated articles
 */
function deduplicateArticles(input, vars = {}) {
  try {
    // Get all articles from merged sources
    const allArticles = input.all().map(item => item.json);
    
    if (allArticles.length === 0) {
      console.warn('No articles to deduplicate');
      return [];
    }
    
    console.log(`Starting deduplication with ${allArticles.length} articles`);
    
    // Load configuration or use defaults
    const config = loadDeduplicationConfig(vars);
    
    // Perform deduplication
    const uniqueArticles = performDeduplication(allArticles, config);
    
    // Sort by publication date (newest first)
    const sortedArticles = sortArticlesByDate(uniqueArticles);
    
    // Limit to maximum articles
    const limitedArticles = sortedArticles.slice(0, config.maxArticles);
    
    console.log(`Deduplication complete: ${allArticles.length} → ${limitedArticles.length} articles`);
    
    return limitedArticles.map(article => ({ json: article }));
    
  } catch (error) {
    console.error('Error during deduplication:', error);
    return input.all(); // Return original articles if deduplication fails
  }
}

/**
 * Load deduplication configuration
 * @param {Object} vars - Environment variables
 * @returns {Object} Configuration object
 */
function loadDeduplicationConfig(vars) {
  return {
    urlSimilarityThreshold: parseFloat(vars.URL_SIMILARITY_THRESHOLD) || 0.8,
    titleSimilarityThreshold: parseFloat(vars.TITLE_SIMILARITY_THRESHOLD) || 0.7,
    maxArticles: parseInt(vars.MAX_ARTICLES_AFTER_DEDUP) || 20,
    enableUrlDedup: vars.ENABLE_URL_DEDUP !== 'false',
    enableTitleDedup: vars.ENABLE_TITLE_DEDUP !== 'false',
    enableContentDedup: vars.ENABLE_CONTENT_DEDUP === 'true',
    contentSimilarityThreshold: parseFloat(vars.CONTENT_SIMILARITY_THRESHOLD) || 0.9
  };
}

/**
 * Perform deduplication using multiple strategies
 * @param {Array} articles - Articles to deduplicate
 * @param {Object} config - Deduplication configuration
 * @returns {Array} Unique articles
 */
function performDeduplication(articles, config) {
  const uniqueArticles = [];
  const seenUrls = new Set();
  const seenTitleHashes = new Set();
  const processedTitles = [];
  
  for (const article of articles) {
    let isDuplicate = false;
    
    // URL-based deduplication
    if (config.enableUrlDedup && article.url) {
      const normalizedUrl = normalizeUrl(article.url);
      
      if (seenUrls.has(normalizedUrl)) {
        isDuplicate = true;
      } else {
        // Check for similar URLs
        for (const existingUrl of seenUrls) {
          if (calculateUrlSimilarity(normalizedUrl, existingUrl) >= config.urlSimilarityThreshold) {
            isDuplicate = true;
            break;
          }
        }
        
        if (!isDuplicate) {
          seenUrls.add(normalizedUrl);
        }
      }
    }
    
    // Title-based deduplication
    if (!isDuplicate && config.enableTitleDedup && article.title) {
      const normalizedTitle = normalizeTitle(article.title);
      const titleHash = simpleHash(normalizedTitle);
      
      if (seenTitleHashes.has(titleHash)) {
        isDuplicate = true;
      } else {
        // Check for similar titles
        for (const existingTitle of processedTitles) {
          if (calculateTitleSimilarity(normalizedTitle, existingTitle) >= config.titleSimilarityThreshold) {
            isDuplicate = true;
            break;
          }
        }
        
        if (!isDuplicate) {
          seenTitleHashes.add(titleHash);
          processedTitles.push(normalizedTitle);
        }
      }
    }
    
    // Content-based deduplication (optional, more expensive)
    if (!isDuplicate && config.enableContentDedup && article.content) {
      const normalizedContent = normalizeContent(article.content);
      
      for (const existingArticle of uniqueArticles) {
        const existingContent = normalizeContent(existingArticle.content);
        if (calculateContentSimilarity(normalizedContent, existingContent) >= config.contentSimilarityThreshold) {
          isDuplicate = true;
          break;
        }
      }
    }
    
    if (!isDuplicate) {
      // Add deduplication metadata
      article.deduplicationInfo = {
        originalIndex: articles.indexOf(article),
        normalizedUrl: article.url ? normalizeUrl(article.url) : null,
        normalizedTitle: article.title ? normalizeTitle(article.title) : null,
        processedAt: new Date().toISOString()
      };
      
      uniqueArticles.push(article);
    } else {
      console.log(`Duplicate detected: ${article.title.slice(0, 60)}...`);
    }
  }
  
  return uniqueArticles;
}

/**
 * Normalize URL for comparison
 * @param {string} url - Raw URL
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  if (!url) return '';
  
  try {
    const urlObj = new URL(url);
    
    // Remove common tracking parameters
    const trackingParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'fbclid', 'gclid', 'ref', 'referrer', 'source', 'campaign'
    ];
    
    trackingParams.forEach(param => {
      urlObj.searchParams.delete(param);
    });
    
    // Normalize the URL
    let normalized = urlObj.origin + urlObj.pathname;
    
    // Add search params if any remain
    if (urlObj.searchParams.toString()) {
      normalized += '?' + urlObj.searchParams.toString();
    }
    
    // Remove trailing slash and convert to lowercase
    return normalized.replace(/\/$/, '').toLowerCase();
    
  } catch (error) {
    // If URL parsing fails, just normalize the string
    return url.toLowerCase()
      .replace(/[?#].*$/, '')  // Remove query params and fragments
      .replace(/\/$/, '');     // Remove trailing slash
  }
}

/**
 * Normalize title for comparison
 * @param {string} title - Raw title
 * @returns {string} Normalized title
 */
function normalizeTitle(title) {
  if (!title) return '';
  
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')        // Replace non-alphanumeric with spaces
    .replace(/\s+/g, ' ')            // Normalize whitespace
    .trim()
    .slice(0, 100);                  // Limit length for comparison
}

/**
 * Normalize content for comparison
 * @param {string} content - Raw content
 * @returns {string} Normalized content
 */
function normalizeContent(content) {
  if (!content) return '';
  
  return content
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')        // Replace non-alphanumeric with spaces
    .replace(/\s+/g, ' ')            // Normalize whitespace
    .trim()
    .slice(0, 500);                  // Limit length for comparison
}

/**
 * Calculate URL similarity using string distance
 * @param {string} url1 - First URL
 * @param {string} url2 - Second URL
 * @returns {number} Similarity score (0-1)
 */
function calculateUrlSimilarity(url1, url2) {
  if (!url1 || !url2) return 0;
  if (url1 === url2) return 1;
  
  // Extract domain and path for comparison
  const domain1 = url1.split('/')[2] || '';
  const domain2 = url2.split('/')[2] || '';
  
  // If domains are different, similarity is low
  if (domain1 !== domain2) {
    return 0.1;
  }
  
  // Calculate string similarity for the full URLs
  return calculateStringSimilarity(url1, url2);
}

/**
 * Calculate title similarity using multiple methods
 * @param {string} title1 - First title
 * @param {string} title2 - Second title
 * @returns {number} Similarity score (0-1)
 */
function calculateTitleSimilarity(title1, title2) {
  if (!title1 || !title2) return 0;
  if (title1 === title2) return 1;
  
  // Use Jaccard similarity for word-based comparison
  const words1 = new Set(title1.split(' ').filter(word => word.length > 2));
  const words2 = new Set(title2.split(' ').filter(word => word.length > 2));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  if (union.size === 0) return 0;
  
  const jaccardSimilarity = intersection.size / union.size;
  
  // Also calculate string similarity
  const stringSimilarity = calculateStringSimilarity(title1, title2);
  
  // Return the higher of the two similarities
  return Math.max(jaccardSimilarity, stringSimilarity);
}

/**
 * Calculate content similarity using word overlap
 * @param {string} content1 - First content
 * @param {string} content2 - Second content
 * @returns {number} Similarity score (0-1)
 */
function calculateContentSimilarity(content1, content2) {
  if (!content1 || !content2) return 0;
  if (content1 === content2) return 1;
  
  // Split into significant words (length > 3)
  const words1 = new Set(content1.split(' ').filter(word => word.length > 3));
  const words2 = new Set(content2.split(' ').filter(word => word.length > 3));
  
  const intersection = new Set([...words1].filter(word => words2.has(word)));
  const union = new Set([...words1, ...words2]);
  
  if (union.size === 0) return 0;
  
  return intersection.size / union.size;
}

/**
 * Calculate string similarity using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score (0-1)
 */
function calculateStringSimilarity(str1, str2) {
  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;
  
  const maxLength = Math.max(str1.length, str2.length);
  if (maxLength === 0) return 1;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLength);
}

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Edit distance
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  // Initialize first row and column
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  // Fill the matrix
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,  // substitution
          matrix[i][j - 1] + 1,      // insertion
          matrix[i - 1][j] + 1       // deletion
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

/**
 * Simple hash function for strings
 * @param {string} str - String to hash
 * @returns {number} Hash value
 */
function simpleHash(str) {
  let hash = 0;
  if (!str || str.length === 0) return hash;
  
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return hash;
}

/**
 * Sort articles by publication date (newest first)
 * @param {Array} articles - Articles to sort
 * @returns {Array} Sorted articles
 */
function sortArticlesByDate(articles) {
  return articles.sort((a, b) => {
    try {
      const dateA = new Date(a.publishedAt);
      const dateB = new Date(b.publishedAt);
      return dateB.getTime() - dateA.getTime();
    } catch (error) {
      return 0; // Keep original order if date parsing fails
    }
  });
}

/**
 * Generate deduplication report
 * @param {Array} originalArticles - Original articles before deduplication
 * @param {Array} uniqueArticles - Articles after deduplication
 * @returns {Object} Deduplication report
 */
function generateDeduplicationReport(originalArticles, uniqueArticles) {
  const report = {
    totalOriginal: originalArticles.length,
    totalUnique: uniqueArticles.length,
    duplicatesRemoved: originalArticles.length - uniqueArticles.length,
    deduplicationRate: ((originalArticles.length - uniqueArticles.length) / originalArticles.length * 100).toFixed(1),
    sourceBreakdown: {}
  };
  
  // Count articles by source
  originalArticles.forEach(article => {
    const source = article.source || 'Unknown';
    report.sourceBreakdown[source] = (report.sourceBreakdown[source] || 0) + 1;
  });
  
  return report;
}

module.exports = {
  deduplicateArticles,
  performDeduplication,
  normalizeUrl,
  normalizeTitle,
  calculateUrlSimilarity,
  calculateTitleSimilarity,
  calculateContentSimilarity,
  sortArticlesByDate,
  generateDeduplicationReport
}; 