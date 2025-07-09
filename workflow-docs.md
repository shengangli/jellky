# AI Japan News Newsletter Generator - Enhanced

## Overview

This n8n workflow automatically generates a daily newsletter focused on artificial intelligence developments in Japan. It aggregates content from multiple sources, processes articles using LLM technology, and publishes formatted newsletters to a Jekyll blog via GitHub.

## Features

- 🌐 **Multi-Source Aggregation**: NewsAPI, RSS feeds, Reddit
- 🤖 **LLM-Powered Content Extraction**: Full article text extraction and cleaning
- 🔄 **Smart Deduplication**: Advanced URL and title similarity matching
- 📝 **Rich Newsletter Generation**: AI-generated comprehensive summaries
- 📚 **Jekyll Integration**: Automatic blog post formatting with frontmatter
- 🚀 **GitHub Publishing**: Direct commit to Jekyll repository
- 📱 **Multi-Channel Notifications**: Slack, Email, Webhook support

## Workflow Architecture

### Data Sources (Parallel Execution)
1. **NewsAPI** - General AI and Japan-related news
2. **RSS Feeds** - Curated tech and AI publications
3. **Reddit** - Community discussions from r/artificial

### Processing Pipeline
1. **Source Processing** - Parse and normalize data from each source
2. **Content Merging** - Combine all articles into unified format
3. **Deduplication** - Remove duplicate articles using advanced matching
4. **Content Extraction** - Full article text extraction using GPT-4
5. **Quality Scoring** - Rank articles by relevance and quality
6. **Newsletter Generation** - AI-powered newsletter creation
7. **Jekyll Formatting** - Add frontmatter and structure for blog
8. **Publishing** - GitHub commit and optional notifications

## Required Credentials & API Keys

### Essential Services
- **OpenAI API Key** - GPT-4 access for content extraction and newsletter generation
- **NewsAPI Key** - Free tier available at https://newsapi.org
- **GitHub OAuth** - Repository access for publishing
- **n8n Environment Variables** - Configure via workflow settings

### Optional Services
- **Slack OAuth** - Team notifications (can be disabled)
- **Email SMTP** - Personal alerts (can be disabled)
- **SerpAPI** - Additional search capabilities (optional)

## Setup Instructions

### 1. Environment Variables Configuration

Create these environment variables in your n8n instance:

```bash
# Required
NEWS_API_KEY=your_newsapi_key_here
OPENAI_API_KEY=your_openai_key_here
GITHUB_OWNER=your_github_username
GITHUB_REPO=your_jekyll_repo_name

# Optional Customization
NEWS_API_PAGE_SIZE=30
NEWS_API_QUERY=(AI OR artificial intelligence OR 人工知能) AND (Japan OR 日本)
REDDIT_LIMIT=25
REDDIT_QUERY=Japan OR Tokyo OR Japanese
WEBSITE_BASE_URL=https://your-site.github.io/repo
SLACK_CHANNEL=#ai-newsletter
EMAIL_FROM=newsletter@yourdomain.com
EMAIL_TO=your-email@example.com
```

### 2. Credential Setup in n8n

1. **OpenAI Credentials**:
   - Go to n8n Credentials
   - Add "OpenAI" credential
   - Enter your OpenAI API key

2. **GitHub OAuth**:
   - Create GitHub OAuth App at https://github.com/settings/applications/new
   - Add "GitHub OAuth2 API" credential in n8n
   - Configure with your OAuth app details

3. **Optional Notifications**:
   - Slack: Create Slack app and OAuth token
   - Email: Configure SMTP settings

### 3. RSS Feeds Customization

Edit `templates/rss-sources.js` to add/modify RSS feeds:

```javascript
const rssFeeds = [
  {
    feedUrl: 'https://your-custom-feed.com/rss',
    source: 'Your Source',
    category: 'tech'
  }
];
```

### 4. Testing Setup

1. **Manual Execution**:
   - Start with manual trigger instead of schedule
   - Monitor each node for errors
   - Check output quality

2. **Validate Environment**:
   ```bash
   node validate-workflow.js
   ```

3. **Test Individual Components**:
   ```bash
   node test-locally.js --component newsapi
   node test-locally.js --component rss
   ```

## Node-by-Node Explanation

### Trigger Nodes

#### Daily Trigger (schedule-trigger)
- **Purpose**: Initiates workflow execution
- **Schedule**: Every 24 hours (configurable)
- **Configuration**: Adjust timing in node parameters
- **Best Practice**: Test with manual trigger first

### Data Collection Nodes

#### Fetch NewsAPI (newsapi-request)
- **Purpose**: Fetches AI and Japan-related news
- **API**: NewsAPI.org REST endpoint
- **Rate Limits**: 1000 requests/day (free tier)
- **Configuration**: Query, date range, page size
- **Error Handling**: Built-in retry mechanism

#### RSS Feed Sources (rss-sources)
- **Purpose**: Defines RSS feed URLs and metadata
- **Configuration**: External template file
- **Customization**: Edit `templates/rss-sources.js`
- **Scaling**: Add unlimited RSS sources

#### Fetch RSS Feeds (rss-fetch)
- **Purpose**: Downloads RSS feed content
- **Parallel Execution**: Processes multiple feeds simultaneously
- **Timeout**: 10 seconds per feed
- **Error Handling**: Continues on individual feed failures

#### Fetch Reddit AI (reddit-fetch)
- **Purpose**: Searches Reddit for Japan AI discussions
- **Subreddit**: r/artificial (configurable)
- **Rate Limits**: No authentication required
- **Filtering**: Time-based (last 24 hours)

### Data Processing Nodes

#### Process NewsAPI (process-newsapi)
- **Purpose**: Normalizes NewsAPI response format
- **Filtering**: Removes [Removed] articles
- **Data Structure**: Standardized article format
- **Template**: `templates/process-newsapi.js`

#### Process RSS (process-rss)
- **Purpose**: Parses XML RSS content
- **AI/Japan Detection**: Keyword-based filtering
- **Content Cleaning**: Removes CDATA and HTML
- **Template**: `templates/process-rss.js`

#### Process Reddit (process-reddit)
- **Purpose**: Extracts Reddit post data
- **Scoring**: Sort by upvotes and relevance
- **Content**: Self-text and external links
- **Template**: `templates/process-reddit.js`

#### Merge All Sources (merge-sources)
- **Purpose**: Combines all article sources
- **Mode**: Multiplex (preserves all inputs)
- **Data Flow**: Feeds into deduplication

#### Deduplicate Articles (deduplicate)
- **Purpose**: Removes duplicate articles
- **Algorithm**: URL and title similarity matching
- **Normalization**: URL cleanup and title comparison
- **Output**: Top 20 unique articles
- **Template**: `templates/deduplicate.js`

### Content Enhancement Nodes

#### Fetch Full Article (fetch-article)
- **Purpose**: Downloads complete article HTML
- **Timeout**: 15 seconds per article
- **Error Handling**: Continues on failure
- **Headers**: User-agent spoofing for access

#### LLM Extract Content (extract-content)
- **Purpose**: Extracts clean article text using GPT-4
- **Model**: GPT-4 Turbo Preview
- **Context**: Article metadata + HTML content
- **Fallback**: Uses description if extraction fails
- **Temperature**: 0.3 (focused output)

#### Combine with Extraction (combine-extraction)
- **Purpose**: Merges original data with extracted content
- **Quality Check**: Validates extraction success
- **Content Length**: Tracks extraction quality
- **Template**: `templates/combine-extraction.js`

#### Select Best Articles (select-best)
- **Purpose**: Ranks and selects top articles
- **Scoring Algorithm**:
  - Content quality (3 points)
  - Content length (2 points)
  - Japan relevance (2 points)
  - AI relevance (2 points)
  - Source quality (2 points)
  - Recency (2 points)
- **Output**: Top 10 articles
- **Template**: `templates/select-best.js`

### Newsletter Generation Nodes

#### Generate Newsletter (generate-newsletter)
- **Purpose**: Creates comprehensive newsletter content
- **Model**: GPT-4 Turbo Preview
- **Structure**:
  - Catchy title
  - Executive summary
  - Top stories (3-5)
  - Quick bytes (3-4)
  - Trend analysis
  - Tomorrow's watch
- **Temperature**: 0.7 (creative output)
- **Max Tokens**: 3000

#### Format Jekyll Post (format-post)
- **Purpose**: Adds Jekyll frontmatter and formatting
- **Frontmatter**: YAML metadata for Jekyll
- **Categories**: newsletter, ai, japan
- **SEO**: Excerpt and tags
- **Filename**: Date-based with slug
- **Template**: `templates/format-post.js`

### Publishing Nodes

#### Publish to GitHub (github-create)
- **Purpose**: Commits newsletter to Jekyll repository
- **Authentication**: OAuth2
- **Path**: `_posts/YYYY-MM-DD-title.md`
- **Commit Message**: Descriptive with title
- **Error Handling**: Fails workflow on error

### Notification Nodes (Optional)

#### Slack Notification (slack-notify)
- **Purpose**: Sends team notification
- **Status**: Disabled by default
- **Channel**: Configurable via environment variable
- **Content**: Title, link, timestamp
- **Authentication**: OAuth2

#### Email Notification (email-notify)
- **Purpose**: Sends personal email alert
- **Status**: Disabled by default
- **Recipients**: Configurable via environment variable
- **Content**: Title, link, publication date
- **SMTP**: Configurable server settings

## Troubleshooting Guide

### Common Issues

#### 1. API Rate Limits
**Symptoms**: HTTP 429 errors, incomplete data
**Solutions**:
- Reduce `NEWS_API_PAGE_SIZE`
- Implement longer delays between requests
- Check API usage in respective dashboards

#### 2. Content Extraction Failures
**Symptoms**: Empty or poor quality content
**Solutions**:
- Check OpenAI API credits and limits
- Verify article URLs are accessible
- Adjust extraction prompts for better results

#### 3. GitHub Publishing Errors
**Symptoms**: 401/403 errors, commits fail
**Solutions**:
- Refresh GitHub OAuth token
- Check repository permissions
- Verify file path format

#### 4. RSS Feed Parsing Issues
**Symptoms**: No RSS articles processed
**Solutions**:
- Test RSS URLs manually
- Check RSS feed format compatibility
- Update parsing logic in template

#### 5. Newsletter Quality Issues
**Symptoms**: Repetitive or poor content
**Solutions**:
- Improve article selection scoring
- Adjust LLM temperature and prompts
- Add more diverse RSS sources

### Debugging Steps

1. **Check Environment Variables**:
   ```bash
   node validate-workflow.js --check-env
   ```

2. **Test Individual Components**:
   ```bash
   node test-locally.js --component [component-name]
   ```

3. **Validate Workflow Structure**:
   ```bash
   node validate-workflow.js --validate-structure
   ```

4. **Monitor n8n Logs**:
   - Check execution history
   - Review error messages
   - Monitor resource usage

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEWS_API_KEY` | Yes | - | NewsAPI.org API key |
| `OPENAI_API_KEY` | Yes | - | OpenAI API key for GPT-4 |
| `GITHUB_OWNER` | Yes | shengangli | GitHub repository owner |
| `GITHUB_REPO` | Yes | jellky | Jekyll repository name |
| `NEWS_API_PAGE_SIZE` | No | 30 | Articles per NewsAPI request |
| `NEWS_API_QUERY` | No | (AI OR artificial intelligence OR 人工知能) AND (Japan OR 日本) | NewsAPI search query |
| `REDDIT_LIMIT` | No | 25 | Reddit posts to fetch |
| `REDDIT_QUERY` | No | Japan OR Tokyo OR Japanese | Reddit search terms |
| `WEBSITE_BASE_URL` | No | https://shengangli.github.io/jellky | Website base URL for links |
| `SLACK_CHANNEL` | No | #ai-newsletter | Slack notification channel |
| `EMAIL_FROM` | No | newsletter@yourdomain.com | Email sender address |
| `EMAIL_TO` | No | your-email@example.com | Email recipient address |

## Performance Optimization

### Execution Time
- **Average Runtime**: 5-10 minutes
- **Peak Usage**: Content extraction phase
- **Optimization**: Parallel processing of sources

### Resource Usage
- **Memory**: ~512MB during LLM operations
- **Network**: ~50-100 API calls per execution
- **Storage**: Minimal (JSON data only)

### Scaling Considerations
- **More Sources**: Add RSS feeds or APIs
- **Larger Volume**: Increase article limits
- **Multiple Languages**: Add localization support
- **Historical Data**: Implement archive functionality

## Customization Guide

### Adding New Data Sources
1. Create new HTTP request node
2. Add processing node with template
3. Connect to merge node
4. Update deduplication logic

### Modifying Newsletter Format
1. Edit LLM prompts in newsletter generation
2. Adjust Jekyll frontmatter template
3. Customize scoring algorithm

### Extending Notifications
1. Add new notification nodes
2. Configure credentials
3. Connect to format-post output

## Support & Maintenance

### Regular Maintenance
- **Weekly**: Check API usage and limits
- **Monthly**: Review RSS feed validity
- **Quarterly**: Update LLM prompts and scoring

### Updates & Versioning
- **Workflow Version**: Track in workflow name
- **Template Updates**: Version control template files
- **Dependency Updates**: Monitor n8n node versions

### Monitoring
- **Success Rate**: Track successful executions
- **Content Quality**: Review newsletter output
- **User Engagement**: Monitor website analytics

---

*This documentation is maintained alongside the workflow. For questions or issues, please check the troubleshooting guide or create an issue in the repository.* 