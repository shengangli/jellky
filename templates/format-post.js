/**
 * Jekyll Post Formatting Template
 * Formats newsletter content into Jekyll blog post format
 */

/**
 * Format newsletter content as Jekyll post with frontmatter
 * @param {Object} input - n8n input data (newsletter content from LLM)
 * @param {Object} vars - n8n environment variables
 * @returns {Array} Formatted Jekyll post data
 */
function formatJekyllPost(input, vars = {}) {
  try {
    const newsletterData = input.first().json;
    
    // Extract LLM-generated newsletter content
    const newsletterContent = extractNewsletterContent(newsletterData);
    
    if (!newsletterContent) {
      throw new Error('No newsletter content found in input');
    }
    
    // Generate Jekyll post components
    const postData = generateJekyllPost(newsletterContent, vars);
    
    console.log(`Formatted Jekyll post: "${postData.title}" (${postData.filename})`);
    
    return [{ json: postData }];
    
  } catch (error) {
    console.error('Error formatting Jekyll post:', error);
    return [{ 
      json: { 
        error: error.message,
        content: '',
        filename: 'error.md',
        path: '_posts/error.md'
      } 
    }];
  }
}

/**
 * Extract newsletter content from LLM response
 * @param {Object} newsletterData - Newsletter data from LLM
 * @returns {string} Extracted content
 */
function extractNewsletterContent(newsletterData) {
  // Handle different response formats
  if (newsletterData.choices && newsletterData.choices.length > 0) {
    // OpenAI format
    return newsletterData.choices[0].message?.content || '';
  } else if (newsletterData.content) {
    // Direct content format
    return newsletterData.content;
  } else if (typeof newsletterData === 'string') {
    // String response
    return newsletterData;
  }
  
  return '';
}

/**
 * Generate complete Jekyll post with frontmatter
 * @param {string} content - Newsletter content
 * @param {Object} vars - Environment variables
 * @returns {Object} Jekyll post data
 */
function generateJekyllPost(content, vars) {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0];
  
  // Extract title from content
  const extractedTitle = extractTitleFromContent(content);
  
  // Clean content (remove title if it exists at the beginning)
  const cleanedContent = removeTitleFromContent(content, extractedTitle);
  
  // Generate frontmatter
  const frontmatter = generateFrontmatter(extractedTitle, dateStr, vars);
  
  // Format main content
  const formattedContent = formatMainContent(cleanedContent);
  
  // Add newsletter metadata section
  const metadataSection = generateMetadataSection(vars);
  
  // Add footer
  const footerSection = generateFooterSection(vars);
  
  // Combine all sections
  const fullContent = [
    frontmatter,
    '',
    formattedContent,
    '',
    metadataSection,
    '',
    footerSection
  ].join('\n');
  
  // Generate filename and path
  const filename = generateFilename(extractedTitle, dateStr);
  const path = `_posts/${filename}`;
  
  return {
    content: fullContent,
    filename: filename,
    path: path,
    date: dateStr,
    title: extractedTitle,
    wordCount: countWords(formattedContent),
    metadata: {
      generatedAt: new Date().toISOString(),
      hasImages: false,
      hasLinks: (formattedContent.match(/\[.*?\]\(.*?\)/g) || []).length > 0,
      sectionCount: (formattedContent.match(/^#+\s/gm) || []).length
    }
  };
}

/**
 * Extract title from newsletter content
 * @param {string} content - Newsletter content
 * @returns {string} Extracted title
 */
function extractTitleFromContent(content) {
  if (!content) return generateDefaultTitle();
  
  // Look for markdown title (# Title)
  const titleMatch = content.match(/^#\s+(.+)$/m);
  if (titleMatch) {
    return cleanTitle(titleMatch[1]);
  }
  
  // Look for title in first line
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length > 0) {
    const firstLine = lines[0].trim();
    if (firstLine.length > 10 && firstLine.length < 100 && !firstLine.includes('.')) {
      return cleanTitle(firstLine);
    }
  }
  
  // Generate default title
  return generateDefaultTitle();
}

/**
 * Remove title from content if it exists at the beginning
 * @param {string} content - Original content
 * @param {string} title - Extracted title
 * @returns {string} Content without title
 */
function removeTitleFromContent(content, title) {
  if (!content || !title) return content;
  
  // Remove markdown title
  const withoutMarkdownTitle = content.replace(/^#\s+.+$/m, '').trim();
  
  // If title appears as first line, remove it
  if (content.startsWith(title)) {
    return content.substring(title.length).trim();
  }
  
  return withoutMarkdownTitle;
}

/**
 * Clean and format title
 * @param {string} title - Raw title
 * @returns {string} Cleaned title
 */
function cleanTitle(title) {
  return title
    .replace(/^#+\s*/, '')        // Remove markdown headers
    .replace(/["""]/g, '"')       // Normalize quotes
    .replace(/[''']/g, "'")       // Normalize apostrophes
    .trim()
    .slice(0, 100);               // Limit length
}

/**
 * Generate default title
 * @returns {string} Default title
 */
function generateDefaultTitle() {
  const today = new Date();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  return `AI Japan Daily - ${monthNames[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
}

/**
 * Generate Jekyll frontmatter
 * @param {string} title - Post title
 * @param {string} date - Publication date
 * @param {Object} vars - Environment variables
 * @returns {string} YAML frontmatter
 */
function generateFrontmatter(title, date, vars) {
  const excerpt = generateExcerpt(title);
  
  return `---
layout: post
title: "${title}"
date: ${date}
categories: [newsletter, ai, japan]
tags: [artificial-intelligence, japan-tech, daily-digest, innovation, machine-learning, technology]
author: AI Newsletter Bot
description: "${excerpt}"
excerpt: "${excerpt}"
image: 
  path: /assets/img/ai-japan-banner.jpg
  alt: "AI Japan Daily Newsletter"
sitemap:
  changefreq: daily
  priority: 0.8
---`;
}

/**
 * Generate excerpt from title
 * @param {string} title - Post title
 * @returns {string} Excerpt
 */
function generateExcerpt(title) {
  const baseExcerpt = "Your daily digest of artificial intelligence news from Japan, featuring the latest breakthroughs, industry updates, and innovation trends.";
  
  if (title.includes('breakthrough') || title.includes('innovation')) {
    return "Discover groundbreaking AI developments from Japan with today's curated selection of technology news and research updates.";
  } else if (title.includes('research') || title.includes('study')) {
    return "Stay informed about cutting-edge AI research and scientific developments emerging from Japan's leading institutions.";
  } else if (title.includes('startup') || title.includes('company')) {
    return "Explore the latest AI business developments, startup news, and corporate innovations from Japan's technology sector.";
  }
  
  return baseExcerpt;
}

/**
 * Format main newsletter content
 * @param {string} content - Raw content
 * @returns {string} Formatted content
 */
function formatMainContent(content) {
  if (!content) return '';
  
  return content
    .replace(/\n{3,}/g, '\n\n')         // Normalize paragraph breaks
    .replace(/^(#{1,6})\s+/gm, '$1 ')   // Normalize header spacing
    .replace(/\*\*(.*?)\*\*/g, '**$1**') // Normalize bold formatting
    .replace(/(\d+)\.\s+/g, '$1. ')     // Normalize numbered lists
    .replace(/^\s*[-*+]\s+/gm, '- ')    // Normalize bullet lists
    .trim();
}

/**
 * Generate newsletter metadata section
 * @param {Object} vars - Environment variables
 * @returns {string} Metadata section
 */
function generateMetadataSection(vars) {
  const today = new Date();
  
  return `---

## 📊 Newsletter Metrics

- **Articles Analyzed**: Multi-source aggregation from NewsAPI, RSS feeds, and Reddit
- **AI-Powered Curation**: Advanced content extraction and relevance scoring
- **Publication Date**: ${today.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  })}
- **Reading Time**: ~5 minutes
- **Sources**: Premium tech publications, research institutions, and community discussions

### 🔍 Coverage Focus
- **AI Research & Development** in Japan
- **Corporate Innovation** and startup news  
- **Industry Partnerships** and investments
- **Regulatory & Policy** updates
- **Community Insights** from tech discussions`;
}

/**
 * Generate footer section
 * @param {Object} vars - Environment variables
 * @returns {string} Footer section
 */
function generateFooterSection(vars) {
  const websiteUrl = vars.WEBSITE_BASE_URL || 'https://shengangli.github.io/jellky';
  
  return `---

## 🤖 About This Newsletter

This newsletter is **automatically generated** using advanced AI technology to curate and summarize the most important artificial intelligence news from Japan. Our system:

- 🔍 **Scans** multiple sources daily for relevant content
- 🤖 **Extracts** full article text using GPT-4
- 📊 **Scores** articles based on relevance, quality, and recency  
- ✍️ **Generates** comprehensive summaries and insights
- 📱 **Publishes** directly to our Jekyll blog

### 📧 Stay Connected

- 🌐 **Website**: [${websiteUrl}](${websiteUrl})
- 📱 **Archive**: [Previous Newsletters](${websiteUrl}/archive)
- 🔗 **RSS Feed**: [Subscribe](${websiteUrl}/feed.xml)

### 🛠️ Technical Details

Built with ❤️ using:
- **n8n** for workflow automation
- **OpenAI GPT-4** for content processing
- **Jekyll** for static site generation
- **GitHub Pages** for hosting

---

*📅 **Next Issue**: Tomorrow morning (JST) | ⚡ **Powered by**: AI + Human curation*`;
}

/**
 * Generate filename for Jekyll post
 * @param {string} title - Post title
 * @param {string} date - Publication date
 * @returns {string} Filename
 */
function generateFilename(title, date) {
  // Create URL-friendly slug from title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')     // Remove special characters
    .replace(/\s+/g, '-')             // Replace spaces with hyphens
    .replace(/-+/g, '-')              // Remove multiple hyphens
    .replace(/^-|-$/g, '')            // Remove leading/trailing hyphens
    .slice(0, 50);                    // Limit length
  
  return `${date}-${slug}.md`;
}

/**
 * Count words in content
 * @param {string} content - Content to count
 * @returns {number} Word count
 */
function countWords(content) {
  if (!content) return 0;
  
  return content
    .replace(/[^\w\s]/g, ' ')         // Replace punctuation with spaces
    .replace(/\s+/g, ' ')             // Normalize whitespace
    .trim()
    .split(' ')
    .filter(word => word.length > 0)
    .length;
}

/**
 * Validate Jekyll post structure
 * @param {Object} postData - Generated post data
 * @returns {boolean} Is valid
 */
function validateJekyllPost(postData) {
  // Must have required fields
  if (!postData.content || !postData.filename || !postData.title) {
    return false;
  }
  
  // Must have proper frontmatter
  if (!postData.content.startsWith('---')) {
    return false;
  }
  
  // Must have reasonable content length
  if (postData.content.length < 500) {
    return false;
  }
  
  return true;
}

/**
 * Add social media metadata
 * @param {string} title - Post title
 * @param {string} excerpt - Post excerpt
 * @returns {string} Social metadata frontmatter
 */
function generateSocialMetadata(title, excerpt) {
  return `
# Social Media
twitter:
  card: summary_large_image
  site: "@ai_japan_daily"
  title: "${title}"
  description: "${excerpt}"
  image: "/assets/img/ai-japan-social.jpg"
  
facebook:
  app_id: "your-app-id"
  
linkedin:
  title: "${title}"
  description: "${excerpt}"`;
}

module.exports = {
  formatJekyllPost,
  extractNewsletterContent,
  generateJekyllPost,
  extractTitleFromContent,
  removeTitleFromContent,
  cleanTitle,
  generateDefaultTitle,
  generateFrontmatter,
  formatMainContent,
  generateMetadataSection,
  generateFooterSection,
  generateFilename,
  countWords,
  validateJekyllPost
}; 