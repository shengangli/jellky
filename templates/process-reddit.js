/**
 * Reddit Processing Template
 * Processes Reddit API responses for the newsletter workflow
 */

/**
 * Process Reddit results into standardized format
 * @param {Object} input - n8n input data
 * @returns {Array} Normalized articles
 */
function processReddit(input) {
  const articles = [];
  
  try {
    const redditData = input.first().json;
    
    // Check if we have valid Reddit response
    if (!redditData.data || !redditData.data.children || !Array.isArray(redditData.data.children)) {
      console.warn('No Reddit posts found in response');
      return [];
    }
    
    // Process each Reddit post
    for (const postWrapper of redditData.data.children) {
      const post = postWrapper.data;
      
      // Skip if not a valid post
      if (!isValidRedditPost(post)) {
        continue;
      }
      
      // Create normalized article object
      const normalizedArticle = normalizeRedditPost(post);
      
      if (normalizedArticle && isRelevantRedditPost(normalizedArticle)) {
        articles.push(normalizedArticle);
      }
    }
    
    // Sort by score and take top posts
    articles.sort((a, b) => (b.originalData.score || 0) - (a.originalData.score || 0));
    
    console.log(`Processed ${articles.length} relevant posts from Reddit`);
    
  } catch (error) {
    console.error('Error processing Reddit response:', error);
    return [];
  }
  
  return articles.slice(0, 10).map(article => ({ json: article }));
}

/**
 * Validate if Reddit post meets minimum requirements
 * @param {Object} post - Reddit post data
 * @returns {boolean} Is valid post
 */
function isValidRedditPost(post) {
  // Must have title
  if (!post.title) {
    return false;
  }
  
  // Skip deleted/removed posts
  if (post.removed_by_category || post.banned_by) {
    return false;
  }
  
  // Skip posts with no content
  if (!post.selftext && !post.url_overridden_by_dest) {
    return false;
  }
  
  // Check minimum score (avoid spam/low quality)
  if (post.score < 1) {
    return false;
  }
  
  // Check if post is too old
  const postAge = Date.now() - (post.created_utc * 1000);
  const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  if (postAge > maxAge) {
    return false;
  }
  
  return true;
}

/**
 * Normalize Reddit post to standard article format
 * @param {Object} post - Reddit post data
 * @returns {Object} Normalized article
 */
function normalizeRedditPost(post) {
  try {
    // Determine URL and content
    let url = post.url_overridden_by_dest || `https://reddit.com${post.permalink}`;
    let content = post.selftext || '';
    let needsExtraction = false;
    
    // If it's a link post to external content, we need extraction
    if (post.url_overridden_by_dest && !post.selftext) {
      needsExtraction = true;
      content = post.title; // Use title as fallback content
    }
    
    // Create description from selftext or title
    let description = '';
    if (post.selftext) {
      description = cleanRedditText(post.selftext).slice(0, 300);
      if (description.length === 300) description += '...';
    } else {
      description = post.title.slice(0, 200);
    }
    
    const article = {
      title: cleanRedditText(post.title),
      description: description,
      url: url,
      source: `Reddit r/${post.subreddit}`,
      publishedAt: new Date(post.created_utc * 1000).toISOString(),
      content: cleanRedditText(content),
      type: 'reddit',
      needsExtraction: needsExtraction,
      originalData: {
        score: post.score,
        upvoteRatio: post.upvote_ratio,
        numComments: post.num_comments,
        author: post.author,
        subreddit: post.subreddit,
        permalink: post.permalink,
        flair: post.link_flair_text,
        awards: post.total_awards_received || 0,
        isVideo: post.is_video,
        domain: post.domain
      }
    };
    
    // Add relevance flags
    article.relevanceFlags = calculateRedditRelevance(article);
    
    return article;
    
  } catch (error) {
    console.error('Error normalizing Reddit post:', error);
    return null;
  }
}

/**
 * Clean Reddit text content
 * @param {string} text - Raw Reddit text
 * @returns {string} Cleaned text
 */
function cleanRedditText(text) {
  if (!text) return '';
  
  return text
    .replace(/&gt;/g, '>')           // Fix Reddit quote markers
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/\n\n+/g, '\n\n')       // Normalize paragraph breaks
    .replace(/^\s+|\s+$/g, '')       // Trim whitespace
    .replace(/\[deleted\]/g, '')     // Remove deleted markers
    .replace(/\[removed\]/g, '')     // Remove removed markers
    .slice(0, 1000);                 // Limit length
}

/**
 * Check if Reddit post is relevant to AI/Japan topics
 * @param {Object} article - Normalized article
 * @returns {boolean} Is relevant
 */
function isRelevantRedditPost(article) {
  const content = (article.title + ' ' + article.description).toLowerCase();
  const subreddit = article.originalData.subreddit.toLowerCase();
  
  // AI-related keywords
  const aiKeywords = [
    'ai', 'artificial intelligence', 'machine learning', 'deep learning',
    'neural', 'robot', 'automation', 'chatgpt', 'gpt', 'openai', 'llm',
    'algorithm', 'ml', 'dl', 'transformer', 'generative'
  ];
  
  // Japan-related keywords
  const japanKeywords = [
    'japan', 'tokyo', 'japanese', 'nippon', 'nihon', 'osaka', 'kyoto',
    'sony', 'toyota', 'softbank', 'nintendo', 'honda', 'panasonic',
    'j-pop', 'anime', 'manga', 'gaming', 'semiconductor'
  ];
  
  // Tech keywords for broader context
  const techKeywords = [
    'technology', 'innovation', 'startup', 'research', 'development',
    'programming', 'software', 'hardware', 'computing', 'digital'
  ];
  
  const hasAI = aiKeywords.some(keyword => content.includes(keyword));
  const hasJapan = japanKeywords.some(keyword => content.includes(keyword));
  const hasTech = techKeywords.some(keyword => content.includes(keyword));
  
  // Check subreddit relevance
  const relevantSubreddits = [
    'artificial', 'machinelearning', 'deeplearning', 'singularity',
    'technology', 'programming', 'japan', 'japantravel', 'newsokur'
  ];
  const inRelevantSubreddit = relevantSubreddits.includes(subreddit);
  
  // Post is relevant if:
  // 1. Has AI keywords, OR
  // 2. Has Japan keywords AND (tech keywords OR in relevant subreddit)
  return hasAI || (hasJapan && (hasTech || inRelevantSubreddit));
}

/**
 * Calculate relevance flags for Reddit posts
 * @param {Object} article - Normalized article
 * @returns {Object} Relevance flags
 */
function calculateRedditRelevance(article) {
  const content = (article.title + ' ' + article.description).toLowerCase();
  const subreddit = article.originalData.subreddit.toLowerCase();
  
  const aiKeywords = [
    'ai', 'artificial intelligence', 'machine learning', 'deep learning',
    'neural', 'robot', 'automation', 'chatgpt', 'openai'
  ];
  
  const japanKeywords = [
    'japan', 'tokyo', 'japanese', 'sony', 'toyota', 'nintendo'
  ];
  
  const techKeywords = [
    'technology', 'innovation', 'startup', 'research', 'development'
  ];
  
  const hasAI = aiKeywords.some(keyword => content.includes(keyword));
  const hasJapan = japanKeywords.some(keyword => content.includes(keyword));
  const hasTech = techKeywords.some(keyword => content.includes(keyword));
  
  // Assess post quality
  const hasHighScore = article.originalData.score >= 10;
  const hasGoodRatio = article.originalData.upvoteRatio >= 0.7;
  const hasDiscussion = article.originalData.numComments >= 5;
  const hasAwards = article.originalData.awards > 0;
  
  // Check content quality
  const hasGoodLength = (article.title.length + article.description.length) > 50;
  const isRecent = isRecentRedditPost(article.publishedAt);
  
  // Assess subreddit quality
  const qualitySubreddits = [
    'artificial', 'machinelearning', 'technology', 'programming',
    'science', 'futurology', 'japan'
  ];
  const isQualitySubreddit = qualitySubreddits.includes(subreddit);
  
  return {
    hasAIKeywords: hasAI,
    hasJapanKeywords: hasJapan,
    hasTechKeywords: hasTech,
    hasHighScore: hasHighScore,
    hasGoodRatio: hasGoodRatio,
    hasDiscussion: hasDiscussion,
    hasAwards: hasAwards,
    hasGoodLength: hasGoodLength,
    isRecent: isRecent,
    isQualitySubreddit: isQualitySubreddit,
    engagementScore: calculateEngagementScore(article.originalData)
  };
}

/**
 * Check if Reddit post is recent
 * @param {string} publishedAt - Publication timestamp
 * @returns {boolean} Is recent
 */
function isRecentRedditPost(publishedAt) {
  try {
    const publishDate = new Date(publishedAt);
    const oneDayAgo = new Date(Date.now() - (24 * 60 * 60 * 1000));
    return publishDate > oneDayAgo;
  } catch {
    return false;
  }
}

/**
 * Calculate engagement score for Reddit post
 * @param {Object} postData - Original Reddit post data
 * @returns {number} Engagement score
 */
function calculateEngagementScore(postData) {
  let score = 0;
  
  // Base score from upvotes
  score += Math.min(postData.score || 0, 100) * 0.1;
  
  // Bonus for good upvote ratio
  if (postData.upvoteRatio >= 0.8) score += 2;
  else if (postData.upvoteRatio >= 0.6) score += 1;
  
  // Bonus for comments (indicates discussion)
  score += Math.min(postData.numComments || 0, 50) * 0.1;
  
  // Bonus for awards
  score += Math.min(postData.awards || 0, 10) * 0.5;
  
  return Math.round(score * 10) / 10; // Round to 1 decimal place
}

/**
 * Filter and rank Reddit articles
 * @param {Array} articles - Processed articles
 * @param {Object} config - Filtering configuration
 * @returns {Array} Filtered and ranked articles
 */
function filterRedditArticles(articles, config = {}) {
  const {
    maxArticles = 10,
    minScore = 5,
    minEngagement = 1.0,
    requireRelevance = true
  } = config;
  
  let filtered = articles;
  
  // Filter by minimum score
  filtered = filtered.filter(article => 
    article.originalData.score >= minScore
  );
  
  // Filter by engagement
  filtered = filtered.filter(article => 
    article.relevanceFlags.engagementScore >= minEngagement
  );
  
  // Filter by relevance if required
  if (requireRelevance) {
    filtered = filtered.filter(article => {
      const flags = article.relevanceFlags;
      return flags.hasAIKeywords || (flags.hasJapanKeywords && flags.hasTechKeywords);
    });
  }
  
  // Sort by combined relevance and engagement score
  filtered.sort((a, b) => {
    const scoreA = calculateRedditOverallScore(a);
    const scoreB = calculateRedditOverallScore(b);
    return scoreB - scoreA;
  });
  
  return filtered.slice(0, maxArticles);
}

/**
 * Calculate overall score for Reddit article
 * @param {Object} article - Article to score
 * @returns {number} Overall score
 */
function calculateRedditOverallScore(article) {
  const flags = article.relevanceFlags;
  let score = 0;
  
  // Relevance scoring
  if (flags.hasAIKeywords) score += 5;
  if (flags.hasJapanKeywords) score += 3;
  if (flags.hasTechKeywords) score += 2;
  
  // Quality scoring
  if (flags.hasHighScore) score += 2;
  if (flags.hasGoodRatio) score += 1;
  if (flags.hasDiscussion) score += 2;
  if (flags.hasAwards) score += 1;
  if (flags.isQualitySubreddit) score += 2;
  
  // Engagement scoring
  score += flags.engagementScore;
  
  // Recency bonus
  if (flags.isRecent) score += 2;
  
  return score;
}

module.exports = {
  processReddit,
  isValidRedditPost,
  normalizeRedditPost,
  cleanRedditText,
  isRelevantRedditPost,
  calculateRedditRelevance,
  calculateEngagementScore,
  filterRedditArticles
}; 