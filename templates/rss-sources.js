/**
 * RSS Sources Configuration
 * Manages RSS feed sources for the AI Japan Newsletter workflow
 */

const fs = require('fs');
const path = require('path');

/**
 * Load RSS feeds from configuration file
 * @param {Object} vars - n8n environment variables
 * @returns {Array} RSS feed configurations
 */
function getRSSFeeds(vars = {}) {
  try {
    // Load configuration from external file
    const configPath = path.join(__dirname, '..', 'workflow-config.json');
    let config = {};
    
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    
    // Get RSS sources from config or use defaults
    const rssSources = config.dataSources?.rss?.sources || getDefaultRSSFeeds();
    
    // Filter enabled sources and apply environment overrides
    const enabledSources = rssSources
      .filter(source => source.enabled !== false)
      .slice(0, config.dataSources?.rss?.maxFeedsPerExecution || 10);
    
    // Map to n8n format
    return enabledSources.map(source => ({
      feedUrl: source.url,
      source: source.name,
      category: source.category,
      priority: source.priority || 'medium',
      language: source.language || 'en'
    }));
    
  } catch (error) {
    console.error('Error loading RSS configuration:', error);
    return getDefaultRSSFeeds();
  }
}

/**
 * Default RSS feeds if configuration is not available
 * @returns {Array} Default RSS feed configurations
 */
function getDefaultRSSFeeds() {
  return [
    {
      url: 'https://www.japantimes.co.jp/feed',
      name: 'Japan Times',
      category: 'general',
      priority: 'high',
      language: 'en'
    },
    {
      url: 'https://asia.nikkei.com/rss/feed/technology',
      name: 'Nikkei Asia Tech',
      category: 'tech',
      priority: 'high',
      language: 'en'
    },
    {
      url: 'https://techcrunch.com/category/artificial-intelligence/feed/',
      name: 'TechCrunch AI',
      category: 'ai',
      priority: 'medium',
      language: 'en'
    },
    {
      url: 'https://feeds.feedburner.com/ArtificialIntelligenceNews-ScienceDaily',
      name: 'Science Daily AI',
      category: 'research',
      priority: 'medium',
      language: 'en'
    },
    {
      url: 'https://venturebeat.com/ai/feed/',
      name: 'VentureBeat AI',
      category: 'business',
      priority: 'low',
      language: 'en'
    }
  ].map(source => ({
    feedUrl: source.url,
    source: source.name,
    category: source.category,
    priority: source.priority,
    language: source.language
  }));
}

/**
 * Validate RSS feed URL
 * @param {string} url - RSS feed URL
 * @returns {boolean} Is valid URL
 */
function isValidRSSUrl(url) {
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
}

/**
 * Add custom RSS feed
 * @param {Object} feedConfig - RSS feed configuration
 * @returns {Object} Feed configuration for n8n
 */
function addCustomFeed(feedConfig) {
  if (!isValidRSSUrl(feedConfig.url)) {
    throw new Error(`Invalid RSS URL: ${feedConfig.url}`);
  }
  
  return {
    feedUrl: feedConfig.url,
    source: feedConfig.name || 'Custom Feed',
    category: feedConfig.category || 'general',
    priority: feedConfig.priority || 'medium',
    language: feedConfig.language || 'en'
  };
}

module.exports = {
  getRSSFeeds,
  getDefaultRSSFeeds,
  addCustomFeed,
  isValidRSSUrl
}; 