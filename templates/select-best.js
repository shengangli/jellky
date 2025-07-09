/**
 * Article Selection Template
 * Selects and ranks the best articles for newsletter inclusion
 */

/**
 * Select best articles for newsletter based on scoring algorithm
 * @param {Object} input - n8n input data (articles with extracted content)
 * @param {Object} vars - n8n environment variables
 * @returns {Array} Selected and ranked articles
 */
function selectBestArticles(input, vars = {}) {
  try {
    // Get all processed articles
    const allArticles = input.all().map(item => item.json);
    
    if (allArticles.length === 0) {
      console.warn('No articles to select from');
      return [{ json: { articles: [], date: new Date().toISOString() } }];
    }
    
    console.log(`Selecting best articles from ${allArticles.length} candidates`);
    
    // Load configuration
    const config = loadSelectionConfig(vars);
    
    // Score all articles
    const scoredArticles = scoreArticles(allArticles, config);
    
    // Filter by minimum score threshold
    const qualifiedArticles = filterByMinimumScore(scoredArticles, config);
    
    // Apply diversity filters
    const diverseArticles = ensureArticleDiversity(qualifiedArticles, config);
    
    // Sort by final score and limit
    const topArticles = diverseArticles
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, config.maxArticles);
    
    // Generate selection metadata
    const selectionMetadata = generateSelectionMetadata(allArticles, topArticles, config);
    
    console.log(`Selected ${topArticles.length} articles with average score: ${
      (topArticles.reduce((sum, article) => sum + article.finalScore, 0) / topArticles.length).toFixed(2)
    }`);
    
    return [{
      json: {
        articles: topArticles,
        metadata: selectionMetadata,
        date: new Date().toISOString()
      }
    }];
    
  } catch (error) {
    console.error('Error selecting best articles:', error);
    return [{ json: { articles: [], date: new Date().toISOString(), error: error.message } }];
  }
}

/**
 * Load article selection configuration
 * @param {Object} vars - Environment variables
 * @returns {Object} Configuration object
 */
function loadSelectionConfig(vars) {
  return {
    maxArticles: parseInt(vars.MAX_ARTICLES_IN_NEWSLETTER) || 10,
    minScore: parseFloat(vars.MIN_ARTICLE_SCORE) || 5.0,
    weights: {
      contentQuality: parseFloat(vars.WEIGHT_CONTENT_QUALITY) || 3,
      contentLength: parseFloat(vars.WEIGHT_CONTENT_LENGTH) || 2,
      japanRelevance: parseFloat(vars.WEIGHT_JAPAN_RELEVANCE) || 2,
      aiRelevance: parseFloat(vars.WEIGHT_AI_RELEVANCE) || 2,
      sourceQuality: parseFloat(vars.WEIGHT_SOURCE_QUALITY) || 2,
      recency: parseFloat(vars.WEIGHT_RECENCY) || 2
    },
    japanKeywords: (vars.JAPAN_KEYWORDS || 'japan,tokyo,japanese,日本,東京,nippon').split(','),
    aiKeywords: (vars.AI_KEYWORDS || 'ai,artificial intelligence,machine learning,deep learning,neural,robot,人工知能,ロボット').split(','),
    premiumSources: (vars.PREMIUM_SOURCES || 'reuters,bloomberg,nikkei,japan times,techcrunch,venturebeat').split(','),
    diversitySettings: {
      maxSameSource: parseInt(vars.MAX_SAME_SOURCE) || 3,
      maxSameCategory: parseInt(vars.MAX_SAME_CATEGORY) || 4,
      preferDiverseSources: vars.PREFER_DIVERSE_SOURCES !== 'false'
    }
  };
}

/**
 * Score articles using comprehensive algorithm
 * @param {Array} articles - Articles to score
 * @param {Object} config - Scoring configuration
 * @returns {Array} Articles with scores
 */
function scoreArticles(articles, config) {
  return articles.map(article => {
    const scores = {
      contentQuality: scoreContentQuality(article, config),
      contentLength: scoreContentLength(article, config),
      japanRelevance: scoreJapanRelevance(article, config),
      aiRelevance: scoreAIRelevance(article, config),
      sourceQuality: scoreSourceQuality(article, config),
      recency: scoreRecency(article, config)
    };
    
    // Calculate weighted final score
    const finalScore = Object.entries(scores).reduce((total, [key, score]) => {
      return total + (score * config.weights[key]);
    }, 0);
    
    return {
      ...article,
      scores,
      finalScore,
      scoringMetadata: {
        scoredAt: new Date().toISOString(),
        maxPossibleScore: Object.values(config.weights).reduce((sum, weight) => sum + weight * 10, 0)
      }
    };
  });
}

/**
 * Score content quality
 * @param {Object} article - Article to score
 * @param {Object} config - Configuration
 * @returns {number} Content quality score (0-10)
 */
function scoreContentQuality(article, config) {
  let score = 5; // Base score
  
  // Extraction success bonus
  if (article.extractionSuccess) {
    score += 2;
  }
  
  // Content quality assessment
  if (article.contentQuality) {
    switch (article.contentQuality.level) {
      case 'excellent': score += 3; break;
      case 'good': score += 2; break;
      case 'fair': score += 1; break;
      case 'poor': score -= 1; break;
      case 'very_poor': score -= 2; break;
    }
  }
  
  // Content source preference
  if (article.contentSource === 'llm_extraction') {
    score += 1;
  } else if (article.contentSource === 'description') {
    score -= 1;
  }
  
  return Math.max(0, Math.min(10, score));
}

/**
 * Score content length appropriateness
 * @param {Object} article - Article to score
 * @param {Object} config - Configuration
 * @returns {number} Content length score (0-10)
 */
function scoreContentLength(article, config) {
  const contentLength = article.contentLength || article.fullContent?.length || 0;
  
  if (contentLength === 0) return 0;
  
  // Optimal length ranges
  if (contentLength >= 500 && contentLength <= 3000) {
    return 10; // Perfect length
  } else if (contentLength >= 300 && contentLength <= 5000) {
    return 8; // Good length
  } else if (contentLength >= 200 && contentLength <= 6000) {
    return 6; // Acceptable length
  } else if (contentLength >= 100) {
    return 4; // Minimum acceptable
  } else {
    return 2; // Too short
  }
}

/**
 * Score Japan relevance
 * @param {Object} article - Article to score
 * @param {Object} config - Configuration
 * @returns {number} Japan relevance score (0-10)
 */
function scoreJapanRelevance(article, config) {
  const content = (article.title + ' ' + article.fullContent + ' ' + article.description).toLowerCase();
  let score = 0;
  
  // Check for Japan keywords
  const japanMatches = config.japanKeywords.filter(keyword => 
    content.includes(keyword.toLowerCase())
  );
  
  score += Math.min(japanMatches.length * 2, 8); // Up to 8 points for keywords
  
  // Bonus for specific Japan-focused content
  if (content.includes('tokyo') || content.includes('東京')) score += 1;
  if (content.includes('japanese company') || content.includes('japan-based')) score += 1;
  
  // Source bonus
  if (article.source && article.source.toLowerCase().includes('japan')) score += 1;
  
  return Math.min(10, score);
}

/**
 * Score AI relevance
 * @param {Object} article - Article to score
 * @param {Object} config - Configuration
 * @returns {number} AI relevance score (0-10)
 */
function scoreAIRelevance(article, config) {
  const content = (article.title + ' ' + article.fullContent + ' ' + article.description).toLowerCase();
  let score = 0;
  
  // Check for AI keywords
  const aiMatches = config.aiKeywords.filter(keyword => 
    content.includes(keyword.toLowerCase())
  );
  
  score += Math.min(aiMatches.length * 1.5, 7); // Up to 7 points for keywords
  
  // Bonus for specific AI topics
  const advancedAITerms = ['neural network', 'deep learning', 'machine learning', 'llm', 'gpt', 'transformer'];
  const advancedMatches = advancedAITerms.filter(term => content.includes(term));
  score += Math.min(advancedMatches.length, 2);
  
  // Bonus for AI research/development context
  if (content.includes('research') || content.includes('development') || content.includes('breakthrough')) {
    score += 1;
  }
  
  return Math.min(10, score);
}

/**
 * Score source quality
 * @param {Object} article - Article to score
 * @param {Object} config - Configuration
 * @returns {number} Source quality score (0-10)
 */
function scoreSourceQuality(article, config) {
  const sourceName = (article.source || '').toLowerCase();
  let score = 5; // Base score
  
  // Premium source bonus
  const isPremiumSource = config.premiumSources.some(source => 
    sourceName.includes(source.toLowerCase())
  );
  
  if (isPremiumSource) {
    score += 3;
  }
  
  // Academic/research source bonus
  if (sourceName.includes('university') || sourceName.includes('research') || 
      sourceName.includes('institute') || sourceName.includes('academic')) {
    score += 2;
  }
  
  // Tech publication bonus
  const techSources = ['techcrunch', 'venturebeat', 'wired', 'ars technica', 'the verge'];
  if (techSources.some(source => sourceName.includes(source))) {
    score += 1;
  }
  
  // Reddit bonus for high engagement
  if (article.type === 'reddit' && article.originalData) {
    const score_reddit = article.originalData.score || 0;
    const upvoteRatio = article.originalData.upvoteRatio || 0;
    
    if (score_reddit > 50 && upvoteRatio > 0.8) score += 2;
    else if (score_reddit > 20 && upvoteRatio > 0.7) score += 1;
  }
  
  return Math.max(0, Math.min(10, score));
}

/**
 * Score article recency
 * @param {Object} article - Article to score
 * @param {Object} config - Configuration
 * @returns {number} Recency score (0-10)
 */
function scoreRecency(article, config) {
  try {
    const publishedDate = new Date(article.publishedAt);
    const now = new Date();
    const ageInHours = (now - publishedDate) / (1000 * 60 * 60);
    
    if (ageInHours < 6) return 10;   // Very recent
    if (ageInHours < 12) return 9;   // Recent
    if (ageInHours < 24) return 8;   // Today
    if (ageInHours < 48) return 6;   // Yesterday
    if (ageInHours < 72) return 4;   // 2-3 days
    if (ageInHours < 168) return 2;  // This week
    
    return 1; // Older than a week
    
  } catch (error) {
    return 5; // Default if date parsing fails
  }
}

/**
 * Filter articles by minimum score threshold
 * @param {Array} articles - Scored articles
 * @param {Object} config - Configuration
 * @returns {Array} Qualified articles
 */
function filterByMinimumScore(articles, config) {
  return articles.filter(article => article.finalScore >= config.minScore);
}

/**
 * Ensure article diversity
 * @param {Array} articles - Qualified articles
 * @param {Object} config - Configuration
 * @returns {Array} Diverse articles
 */
function ensureArticleDiversity(articles, config) {
  if (!config.diversitySettings.preferDiverseSources) {
    return articles;
  }
  
  const diverseArticles = [];
  const sourceCounts = {};
  const categoryCounts = {};
  
  // Sort by score first
  const sortedArticles = articles.sort((a, b) => b.finalScore - a.finalScore);
  
  for (const article of sortedArticles) {
    const source = article.source || 'unknown';
    const category = article.type || 'unknown';
    
    const sourceCount = sourceCounts[source] || 0;
    const categoryCount = categoryCounts[category] || 0;
    
    // Check diversity constraints
    if (sourceCount < config.diversitySettings.maxSameSource &&
        categoryCount < config.diversitySettings.maxSameCategory) {
      
      diverseArticles.push(article);
      sourceCounts[source] = sourceCount + 1;
      categoryCounts[category] = categoryCount + 1;
    }
  }
  
  return diverseArticles;
}

/**
 * Generate selection metadata
 * @param {Array} allArticles - All articles considered
 * @param {Array} selectedArticles - Selected articles
 * @param {Object} config - Configuration
 * @returns {Object} Selection metadata
 */
function generateSelectionMetadata(allArticles, selectedArticles, config) {
  const metadata = {
    totalConsidered: allArticles.length,
    totalSelected: selectedArticles.length,
    selectionRate: (selectedArticles.length / allArticles.length * 100).toFixed(1),
    averageScore: selectedArticles.length > 0 ? 
      (selectedArticles.reduce((sum, article) => sum + article.finalScore, 0) / selectedArticles.length).toFixed(2) : 0,
    scoreRange: selectedArticles.length > 0 ? {
      min: Math.min(...selectedArticles.map(a => a.finalScore)).toFixed(2),
      max: Math.max(...selectedArticles.map(a => a.finalScore)).toFixed(2)
    } : { min: 0, max: 0 },
    sourceBreakdown: {},
    categoryBreakdown: {},
    qualityBreakdown: {},
    config: {
      weights: config.weights,
      minScore: config.minScore,
      maxArticles: config.maxArticles
    }
  };
  
  // Count by source
  selectedArticles.forEach(article => {
    const source = article.source || 'Unknown';
    metadata.sourceBreakdown[source] = (metadata.sourceBreakdown[source] || 0) + 1;
  });
  
  // Count by category/type
  selectedArticles.forEach(article => {
    const category = article.type || 'unknown';
    metadata.categoryBreakdown[category] = (metadata.categoryBreakdown[category] || 0) + 1;
  });
  
  // Count by content quality
  selectedArticles.forEach(article => {
    const quality = article.contentQuality?.level || 'unknown';
    metadata.qualityBreakdown[quality] = (metadata.qualityBreakdown[quality] || 0) + 1;
  });
  
  return metadata;
}

module.exports = {
  selectBestArticles,
  scoreArticles,
  scoreContentQuality,
  scoreContentLength,
  scoreJapanRelevance,
  scoreAIRelevance,
  scoreSourceQuality,
  scoreRecency,
  filterByMinimumScore,
  ensureArticleDiversity,
  generateSelectionMetadata
}; 