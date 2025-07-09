#!/usr/bin/env node

/**
 * Local Testing Script
 * Tests individual node logic without requiring n8n
 */

const fs = require('fs');
const path = require('path');

// Mock n8n environment
const mockN8nEnvironment = {
  // Mock input object
  createMockInput: (data) => ({
    first: () => ({ json: data }),
    all: () => Array.isArray(data) ? data.map(item => ({ json: item })) : [{ json: data }]
  }),
  
  // Mock environment variables
  vars: {
    NEWS_API_KEY: 'test-api-key',
    OPENAI_API_KEY: 'test-openai-key',
    GITHUB_OWNER: 'test-owner',
    GITHUB_REPO: 'test-repo',
    WEBSITE_BASE_URL: 'https://test.example.com'
  }
};

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

/**
 * Main testing function
 */
async function runTests() {
  console.log(`${colors.cyan}${colors.bright}🧪 n8n Workflow Local Tester${colors.reset}\n`);
  
  try {
    const args = parseArguments();
    
    if (args.testAll) {
      await runAllTests();
    } else if (args.testTemplate) {
      await testSpecificTemplate(args.testTemplate);
    } else if (args.interactive) {
      await runInteractiveMode();
    } else {
      displayHelp();
    }
    
  } catch (error) {
    console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    testAll: false,
    testTemplate: null,
    interactive: false,
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--all':
        options.testAll = true;
        break;
      case '--template':
      case '-t':
        options.testTemplate = args[++i];
        break;
      case '--interactive':
      case '-i':
        options.interactive = true;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--help':
      case '-h':
        displayHelp();
        process.exit(0);
        break;
    }
  }
  
  return options;
}

/**
 * Display help information
 */
function displayHelp() {
  console.log(`${colors.cyan}n8n Workflow Local Tester${colors.reset}

${colors.bright}Usage:${colors.reset}
  node test-locally.js [options]

${colors.bright}Options:${colors.reset}
  --all                   Run all template tests
  -t, --template <name>   Test specific template (e.g., 'process-newsapi')
  -i, --interactive       Run in interactive mode
  -v, --verbose          Show detailed test output
  -h, --help             Show this help message

${colors.bright}Examples:${colors.reset}
  node test-locally.js --all
  node test-locally.js --template process-newsapi
  node test-locally.js --interactive
`);
}

/**
 * Run all template tests
 */
async function runAllTests() {
  console.log(`${colors.bright}🚀 Running All Template Tests${colors.reset}\n`);
  
  const templateDir = 'templates';
  if (!fs.existsSync(templateDir)) {
    throw new Error('Templates directory not found');
  }
  
  const templateFiles = fs.readdirSync(templateDir)
    .filter(file => file.endsWith('.js'))
    .map(file => file.replace('.js', ''));
  
  const results = [];
  
  for (const templateName of templateFiles) {
    console.log(`${colors.blue}Testing ${templateName}...${colors.reset}`);
    try {
      const result = await testTemplate(templateName);
      results.push({ template: templateName, success: true, result });
      console.log(`${colors.green}✓ ${templateName} passed${colors.reset}\n`);
    } catch (error) {
      results.push({ template: templateName, success: false, error: error.message });
      console.log(`${colors.red}✗ ${templateName} failed: ${error.message}${colors.reset}\n`);
    }
  }
  
  // Summary
  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`${colors.bright}📊 Test Summary:${colors.reset}`);
  console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`);
  
  if (failed > 0) {
    console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
    results.filter(r => !r.success).forEach(result => {
      console.log(`  ${colors.red}• ${result.template}: ${result.error}${colors.reset}`);
    });
  }
}

/**
 * Test specific template
 */
async function testSpecificTemplate(templateName) {
  console.log(`${colors.bright}🔬 Testing Template: ${templateName}${colors.reset}\n`);
  
  try {
    const result = await testTemplate(templateName);
    console.log(`${colors.green}✓ Test passed successfully${colors.reset}`);
    console.log(`${colors.cyan}Result:${colors.reset}`, JSON.stringify(result, null, 2));
  } catch (error) {
    console.log(`${colors.red}✗ Test failed: ${error.message}${colors.reset}`);
    throw error;
  }
}

/**
 * Run interactive testing mode
 */
async function runInteractiveMode() {
  console.log(`${colors.bright}🎮 Interactive Testing Mode${colors.reset}\n`);
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));
  
  try {
    while (true) {
      console.log(`\n${colors.cyan}Available templates:${colors.reset}`);
      const templateFiles = fs.readdirSync('templates')
        .filter(file => file.endsWith('.js'))
        .map(file => file.replace('.js', ''));
      
      templateFiles.forEach((template, index) => {
        console.log(`  ${index + 1}. ${template}`);
      });
      
      const choice = await question(`\nEnter template name or number (q to quit): `);
      
      if (choice.toLowerCase() === 'q' || choice.toLowerCase() === 'quit') {
        break;
      }
      
      let templateName;
      if (!isNaN(choice)) {
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < templateFiles.length) {
          templateName = templateFiles[index];
        } else {
          console.log(`${colors.red}Invalid choice${colors.reset}`);
          continue;
        }
      } else {
        templateName = choice;
      }
      
      try {
        const result = await testTemplate(templateName);
        console.log(`${colors.green}✓ Test passed${colors.reset}`);
        console.log(`${colors.cyan}Result:${colors.reset}`, JSON.stringify(result, null, 2));
      } catch (error) {
        console.log(`${colors.red}✗ Test failed: ${error.message}${colors.reset}`);
      }
    }
  } finally {
    rl.close();
  }
}

/**
 * Test individual template
 */
async function testTemplate(templateName) {
  const templatePath = path.join('templates', `${templateName}.js`);
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template file not found: ${templatePath}`);
  }
  
  // Load template module
  const templateModule = require(`./${templatePath}`);
  
  // Get test data for template
  const testData = getTestData(templateName);
  
  // Create mock input
  const mockInput = mockN8nEnvironment.createMockInput(testData.input);
  
  // Execute appropriate test based on template type
  switch (templateName) {
    case 'rss-sources':
      return await testRSSSources(templateModule, mockInput);
    case 'process-newsapi':
      return await testProcessNewsAPI(templateModule, mockInput);
    case 'process-rss':
      return await testProcessRSS(templateModule, mockInput);
    case 'process-reddit':
      return await testProcessReddit(templateModule, mockInput);
    case 'deduplicate':
      return await testDeduplicate(templateModule, mockInput);
    case 'combine-extraction':
      return await testCombineExtraction(templateModule, mockInput);
    case 'select-best':
      return await testSelectBest(templateModule, mockInput);
    case 'format-post':
      return await testFormatPost(templateModule, mockInput);
    default:
      throw new Error(`No test defined for template: ${templateName}`);
  }
}

/**
 * Get test data for specific template
 */
function getTestData(templateName) {
  const testDataMap = {
    'rss-sources': {
      input: {}
    },
    'process-newsapi': {
      input: {
        articles: [
          {
            title: "Japan's AI Research Breakthrough",
            description: "Japanese researchers develop new AI algorithm",
            url: "https://example.com/article1",
            source: { name: "Tech News" },
            publishedAt: "2025-01-15T10:00:00Z",
            content: "Full article content here..."
          }
        ],
        status: "ok",
        totalResults: 1
      }
    },
    'process-rss': {
      input: `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <item>
      <title>AI Innovation in Tokyo</title>
      <link>https://example.com/rss-article</link>
      <description>New AI startup launches in Tokyo</description>
      <pubDate>Wed, 15 Jan 2025 10:00:00 GMT</pubDate>
    </item>
  </channel>
</rss>`
    },
    'process-reddit': {
      input: {
        data: {
          children: [
            {
              data: {
                title: "Amazing AI breakthrough in Japan",
                selftext: "Discussion about new AI technology",
                url: "https://reddit.com/r/artificial/example",
                score: 150,
                upvote_ratio: 0.95,
                num_comments: 25,
                author: "testuser",
                subreddit: "artificial",
                created_utc: Math.floor(Date.now() / 1000) - 3600
              }
            }
          ]
        }
      }
    },
    'deduplicate': {
      input: [
        {
          title: "Article 1",
          url: "https://example.com/1",
          publishedAt: "2025-01-15T10:00:00Z"
        },
        {
          title: "Article 1",
          url: "https://example.com/1",
          publishedAt: "2025-01-15T10:00:00Z"
        },
        {
          title: "Different Article",
          url: "https://example.com/2",
          publishedAt: "2025-01-15T11:00:00Z"
        }
      ]
    },
    'combine-extraction': {
      input: [
        {
          title: "Test Article",
          content: "Original content"
        },
        {
          choices: [
            {
              message: {
                content: "Extracted content from LLM"
              }
            }
          ]
        }
      ]
    },
    'select-best': {
      input: [
        {
          title: "AI Japan Article",
          fullContent: "Content about AI in Japan",
          extractionSuccess: true,
          contentQuality: { level: 'good' },
          publishedAt: "2025-01-15T10:00:00Z",
          source: "Tech News"
        }
      ]
    },
    'format-post': {
      input: {
        choices: [
          {
            message: {
              content: "# AI Japan Daily Newsletter\n\nToday's top stories about AI in Japan..."
            }
          }
        ]
      }
    }
  };
  
  return testDataMap[templateName] || { input: {} };
}

/**
 * Test RSS Sources template
 */
async function testRSSSources(templateModule, mockInput) {
  if (typeof templateModule.getRSSFeeds === 'function') {
    return templateModule.getRSSFeeds(mockN8nEnvironment.vars);
  }
  throw new Error('getRSSFeeds function not found in template');
}

/**
 * Test NewsAPI processing template
 */
async function testProcessNewsAPI(templateModule, mockInput) {
  if (typeof templateModule.processNewsAPI === 'function') {
    return templateModule.processNewsAPI(mockInput);
  }
  throw new Error('processNewsAPI function not found in template');
}

/**
 * Test RSS processing template
 */
async function testProcessRSS(templateModule, mockInput) {
  if (typeof templateModule.processRSS === 'function') {
    return templateModule.processRSS(mockInput);
  }
  throw new Error('processRSS function not found in template');
}

/**
 * Test Reddit processing template
 */
async function testProcessReddit(templateModule, mockInput) {
  if (typeof templateModule.processReddit === 'function') {
    return templateModule.processReddit(mockInput);
  }
  throw new Error('processReddit function not found in template');
}

/**
 * Test deduplication template
 */
async function testDeduplicate(templateModule, mockInput) {
  if (typeof templateModule.deduplicateArticles === 'function') {
    return templateModule.deduplicateArticles(mockInput, mockN8nEnvironment.vars);
  }
  throw new Error('deduplicateArticles function not found in template');
}

/**
 * Test content extraction combination template
 */
async function testCombineExtraction(templateModule, mockInput) {
  if (typeof templateModule.combineExtraction === 'function') {
    return templateModule.combineExtraction(mockInput);
  }
  throw new Error('combineExtraction function not found in template');
}

/**
 * Test article selection template
 */
async function testSelectBest(templateModule, mockInput) {
  if (typeof templateModule.selectBestArticles === 'function') {
    return templateModule.selectBestArticles(mockInput, mockN8nEnvironment.vars);
  }
  throw new Error('selectBestArticles function not found in template');
}

/**
 * Test post formatting template
 */
async function testFormatPost(templateModule, mockInput) {
  if (typeof templateModule.formatJekyllPost === 'function') {
    return templateModule.formatJekyllPost(mockInput, mockN8nEnvironment.vars);
  }
  throw new Error('formatJekyllPost function not found in template');
}

/**
 * Validate test results
 */
function validateTestResult(result, expectedStructure) {
  if (!result) {
    throw new Error('Test returned null or undefined result');
  }
  
  if (Array.isArray(expectedStructure)) {
    if (!Array.isArray(result)) {
      throw new Error('Expected array result');
    }
  } else if (typeof expectedStructure === 'object') {
    if (typeof result !== 'object') {
      throw new Error('Expected object result');
    }
  }
  
  return true;
}

// Run tests if script is executed directly
if (require.main === module) {
  runTests().catch(error => {
    console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  runTests,
  testTemplate,
  mockN8nEnvironment
}; 