# AI Japan Newsletter - n8n Workflow

An automated newsletter generation system that curates AI news from Japan using n8n, OpenAI GPT-4, and Jekyll.

## 🌟 Features

- **Multi-Source Data Collection**: NewsAPI, RSS feeds, Reddit
- **AI-Powered Content Processing**: GPT-4 for article extraction and summarization
- **Intelligent Deduplication**: URL and title similarity matching
- **Quality-Based Article Selection**: Comprehensive scoring algorithm
- **Jekyll Blog Integration**: Automatic publishing to GitHub Pages
- **Comprehensive Notifications**: Slack, Email, Webhook support

## 📁 Project Structure

```
├── ai-japan-newsletter-workflow.json    # Main n8n workflow file
├── workflow-config.json                 # Configuration settings
├── workflow-docs.md                     # Comprehensive documentation
├── templates/                           # JavaScript templates for processing
│   ├── rss-sources.js                  # RSS feed management
│   ├── process-newsapi.js              # NewsAPI response processing
│   ├── process-rss.js                  # RSS XML parsing
│   ├── process-reddit.js               # Reddit API processing
│   ├── deduplicate.js                  # Article deduplication
│   ├── combine-extraction.js           # Content extraction combination
│   ├── select-best.js                  # Article selection and ranking
│   └── format-post.js                  # Jekyll post formatting
├── validate-workflow.js                # Workflow validation script
├── test-locally.js                     # Local testing script
├── deploy-workflow.js                  # Deployment script
└── README.md                           # This file
```

## 🚀 Quick Start

### 1. Prerequisites

- **n8n instance** (local or cloud)
- **API Keys**:
  - NewsAPI key from [newsapi.org](https://newsapi.org)
  - OpenAI API key with GPT-4 access
  - GitHub personal access token
- **Node.js** (for helper scripts)

### 2. Configuration

1. **Update workflow-config.json** with your settings:
   ```json
   {
     "dataSources": {
       "newsapi": {
         "apiKey": "YOUR_NEWS_API_KEY"
       }
     },
     "llm": {
       "openaiApiKey": "YOUR_OPENAI_API_KEY"
     },
     "publishing": {
       "github": {
         "owner": "YOUR_GITHUB_USERNAME",
         "repo": "YOUR_REPO_NAME"
       }
     }
   }
   ```

2. **Set up environment variables in n8n**:
   ```
   NEWS_API_KEY=your_newsapi_key
   OPENAI_API_KEY=your_openai_key
   GITHUB_OWNER=your_github_username
   GITHUB_REPO=your_repo_name
   WEBSITE_BASE_URL=https://your-site.github.io
   ```

### 3. Validation and Testing

1. **Validate the workflow**:
   ```bash
   node validate-workflow.js --check-env --verbose
   ```

2. **Test individual components**:
   ```bash
   # Test all templates
   node test-locally.js --all
   
   # Test specific template
   node test-locally.js --template process-newsapi
   
   # Interactive testing
   node test-locally.js --interactive
   ```

### 4. Deployment

1. **Deploy to n8n**:
   ```bash
   # Local n8n instance
   node deploy-workflow.js --url http://localhost:5678 --api-key your-api-key
   
   # n8n Cloud
   node deploy-workflow.js --url https://your-instance.app.n8n.cloud --api-key your-api-key --update
   
   # Dry run (validation only)
   node deploy-workflow.js --dry-run --verbose
   ```

2. **Configure credentials in n8n**:
   - OpenAI credentials for ChatGPT nodes
   - GitHub credentials for repository access
   - Slack credentials (if using notifications)

## 📊 Workflow Overview

### Data Collection Phase
1. **Schedule Trigger**: Runs daily at configured time
2. **NewsAPI Fetch**: Collects articles about AI and Japan
3. **RSS Feed Processing**: Processes multiple RSS sources
4. **Reddit Integration**: Gathers community discussions

### Processing Phase
1. **Content Extraction**: GPT-4 extracts full article text
2. **Data Normalization**: Standardizes article format
3. **Deduplication**: Removes duplicate content
4. **Quality Assessment**: Scores articles for relevance

### Content Generation Phase
1. **Article Selection**: Chooses best articles based on scoring
2. **Newsletter Generation**: GPT-4 creates comprehensive newsletter
3. **Jekyll Formatting**: Formats content with frontmatter
4. **GitHub Publishing**: Commits to Jekyll repository

### Notification Phase
1. **Success Notifications**: Slack/Email alerts
2. **Error Handling**: Detailed error reporting
3. **Metrics Tracking**: Performance monitoring

## 🔧 Customization

### Modifying Data Sources

Edit `templates/rss-sources.js` to add/remove RSS feeds:
```javascript
const rssFeeds = [
  {
    feedUrl: 'https://your-source.com/feed',
    source: 'Your Source',
    category: 'tech',
    priority: 'high'
  }
];
```

### Adjusting Article Scoring

Modify scoring weights in `workflow-config.json`:
```json
{
  "contentProcessing": {
    "scoring": {
      "weights": {
        "contentQuality": 3,
        "japanRelevance": 2,
        "aiRelevance": 2,
        "recency": 2
      }
    }
  }
}
```

### Customizing Newsletter Format

Edit `templates/format-post.js` to modify:
- Jekyll frontmatter
- Post structure
- Metadata sections
- Footer content

## 🧪 Testing

### Unit Testing

Test individual templates:
```bash
# Test NewsAPI processing
node test-locally.js --template process-newsapi

# Test article selection
node test-locally.js --template select-best

# Test Jekyll formatting
node test-locally.js --template format-post
```

### Integration Testing

1. **Manual Workflow Execution**: Run workflow manually in n8n
2. **Staged Testing**: Test with limited data sources
3. **Production Validation**: Monitor first few automated runs

### Validation Checklist

- [ ] Workflow JSON is valid
- [ ] All template files exist
- [ ] Environment variables configured
- [ ] API keys are valid
- [ ] GitHub repository accessible
- [ ] Jekyll site builds correctly

## 📚 Documentation

### Detailed Guides

- **[workflow-docs.md](workflow-docs.md)**: Complete workflow documentation
- **[Node Documentation](#node-documentation)**: Individual node explanations
- **[API Integration](#api-integration)**: External service setup
- **[Troubleshooting](#troubleshooting)**: Common issues and solutions

### Template Reference

Each template in `templates/` includes:
- **Input/Output formats**
- **Configuration options**
- **Error handling**
- **Test examples**

## 🛠️ Development

### Making Changes

1. **Edit templates** in `templates/` directory
2. **Test changes** with `test-locally.js`
3. **Validate workflow** with `validate-workflow.js`
4. **Deploy updates** with `deploy-workflow.js --update`

### Adding New Features

1. **Create new template** if needed
2. **Update workflow JSON** to include new nodes
3. **Add test cases** to `test-locally.js`
4. **Update configuration** schema

### Best Practices

- **Use environment variables** for sensitive data
- **Test templates individually** before integration
- **Validate workflow** before deployment
- **Monitor execution** logs in n8n
- **Keep templates modular** and reusable

## 🚨 Troubleshooting

### Common Issues

#### Workflow Import Fails
```bash
# Validate workflow structure
node validate-workflow.js --verbose

# Check for syntax errors
node validate-workflow.js --check-env
```

#### Template Errors
```bash
# Test specific template
node test-locally.js --template template-name

# Check template exports
grep "module.exports" templates/*.js
```

#### API Connection Issues
```bash
# Test n8n connection
node deploy-workflow.js --dry-run --verbose

# Verify API keys
echo $NEWS_API_KEY
echo $OPENAI_API_KEY
```

#### Content Quality Issues
- Adjust scoring weights in configuration
- Review article selection criteria
- Monitor content extraction success rates

### Debug Mode

Enable verbose logging:
```bash
# Detailed validation
node validate-workflow.js --verbose

# Detailed testing
node test-locally.js --template process-newsapi --verbose

# Detailed deployment
node deploy-workflow.js --verbose
```

### Log Analysis

Check n8n execution logs:
1. **Workflow executions** tab in n8n
2. **Individual node outputs**
3. **Error messages** and stack traces
4. **Execution time** and performance metrics

## 📈 Monitoring

### Key Metrics

- **Articles processed** per run
- **Deduplication rate**
- **Content extraction success**
- **Newsletter generation time**
- **Publishing success rate**

### Performance Optimization

- **Parallel processing** where possible
- **Efficient deduplication** algorithms
- **Content length limits**
- **API rate limiting** compliance

## 🤝 Contributing

### Guidelines

1. **Test changes** thoroughly
2. **Document new features**
3. **Follow code style** conventions
4. **Update configuration** schemas

### Development Workflow

1. **Fork repository**
2. **Create feature branch**
3. **Test locally** with helper scripts
4. **Submit pull request**

## 📄 License

This project is open source. Please review the license file for details.

## 🆘 Support

For issues and questions:

1. **Check documentation** first
2. **Run validation scripts**
3. **Review n8n logs**
4. **Create detailed issue** with reproduction steps

---

**Happy automating!** 🤖✨ 
