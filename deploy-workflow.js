#!/usr/bin/env node

/**
 * n8n Workflow Deployment Script
 * Deploys workflow to n8n instance via API
 */

const fs = require('fs');
const https = require('https');
const http = require('http');
const { URL } = require('url');

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
 * Main deployment function
 */
async function deployWorkflow() {
  console.log(`${colors.cyan}${colors.bright}🚀 n8n Workflow Deployer${colors.reset}\n`);
  
  try {
    // Parse command line arguments
    const args = parseArguments();
    
    // Load configuration
    const config = loadConfiguration(args);
    
    // Validate configuration
    validateConfiguration(config);
    
    // Load workflow file
    const workflow = loadWorkflowFile(config.workflowFile);
    
    // Connect to n8n API
    console.log(`${colors.blue}🔗 Connecting to n8n instance: ${config.n8nUrl}${colors.reset}`);
    
    // Check n8n health
    await checkN8nHealth(config);
    
    // Deploy workflow
    const result = await deployWorkflowToN8n(workflow, config);
    
    // Display results
    displayDeploymentResult(result, config);
    
  } catch (error) {
    console.error(`${colors.red}Deployment failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    workflowFile: 'ai-japan-newsletter-workflow.json',
    configFile: null,
    n8nUrl: null,
    apiKey: null,
    update: false,
    activate: true,
    dryRun: false,
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
      case '-f':
        options.workflowFile = args[++i];
        break;
      case '--config':
      case '-c':
        options.configFile = args[++i];
        break;
      case '--url':
      case '-u':
        options.n8nUrl = args[++i];
        break;
      case '--api-key':
      case '-k':
        options.apiKey = args[++i];
        break;
      case '--update':
        options.update = true;
        break;
      case '--no-activate':
        options.activate = false;
        break;
      case '--dry-run':
        options.dryRun = true;
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
  console.log(`${colors.cyan}n8n Workflow Deployer${colors.reset}

${colors.bright}Usage:${colors.reset}
  node deploy-workflow.js [options]

${colors.bright}Options:${colors.reset}
  -f, --file <file>       Workflow JSON file to deploy (default: ai-japan-newsletter-workflow.json)
  -c, --config <file>     Configuration file (optional)
  -u, --url <url>         n8n instance URL
  -k, --api-key <key>     n8n API key
  --update               Update existing workflow if it exists
  --no-activate          Don't activate workflow after deployment
  --dry-run              Validate without actually deploying
  -v, --verbose          Show detailed deployment output
  -h, --help             Show this help message

${colors.bright}Environment Variables:${colors.reset}
  N8N_URL                n8n instance URL
  N8N_API_KEY            n8n API key

${colors.bright}Examples:${colors.reset}
  node deploy-workflow.js --url http://localhost:5678 --api-key your-key
  node deploy-workflow.js --config deploy-config.json --update
  node deploy-workflow.js --dry-run --verbose
`);
}

/**
 * Load deployment configuration
 */
function loadConfiguration(args) {
  let config = {
    workflowFile: args.workflowFile,
    n8nUrl: args.n8nUrl || process.env.N8N_URL,
    apiKey: args.apiKey || process.env.N8N_API_KEY,
    update: args.update,
    activate: args.activate,
    dryRun: args.dryRun,
    verbose: args.verbose,
    timeout: 30000,
    retries: 3
  };
  
  // Load from configuration file if specified
  if (args.configFile) {
    if (!fs.existsSync(args.configFile)) {
      throw new Error(`Configuration file not found: ${args.configFile}`);
    }
    
    try {
      const configFile = JSON.parse(fs.readFileSync(args.configFile, 'utf8'));
      config = { ...config, ...configFile };
    } catch (error) {
      throw new Error(`Invalid configuration file: ${error.message}`);
    }
  }
  
  return config;
}

/**
 * Validate configuration
 */
function validateConfiguration(config) {
  if (!config.n8nUrl) {
    throw new Error('n8n URL is required (use --url or N8N_URL environment variable)');
  }
  
  if (!config.apiKey) {
    throw new Error('n8n API key is required (use --api-key or N8N_API_KEY environment variable)');
  }
  
  // Validate URL format
  try {
    new URL(config.n8nUrl);
  } catch (error) {
    throw new Error(`Invalid n8n URL: ${config.n8nUrl}`);
  }
  
  // Ensure URL ends with /api/v1
  if (!config.n8nUrl.endsWith('/api/v1')) {
    if (config.n8nUrl.endsWith('/')) {
      config.n8nUrl += 'api/v1';
    } else {
      config.n8nUrl += '/api/v1';
    }
  }
}

/**
 * Load workflow file
 */
function loadWorkflowFile(filename) {
  console.log(`📁 Loading workflow file: ${colors.bright}${filename}${colors.reset}`);
  
  if (!fs.existsSync(filename)) {
    throw new Error(`Workflow file not found: ${filename}`);
  }
  
  try {
    const content = fs.readFileSync(filename, 'utf8');
    const workflow = JSON.parse(content);
    
    console.log(`${colors.green}✓${colors.reset} Workflow loaded: ${workflow.name || 'Unnamed Workflow'}\n`);
    return workflow;
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in workflow file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Check n8n instance health
 */
async function checkN8nHealth(config) {
  const healthUrl = config.n8nUrl.replace('/api/v1', '/healthz');
  
  try {
    const response = await makeRequest('GET', healthUrl);
    
    if (response.status === 'ok') {
      console.log(`${colors.green}✓${colors.reset} n8n instance is healthy\n`);
    } else {
      console.log(`${colors.yellow}⚠${colors.reset} n8n instance health check returned: ${response.status}\n`);
    }
  } catch (error) {
    console.log(`${colors.yellow}⚠${colors.reset} Could not check n8n health: ${error.message}\n`);
  }
}

/**
 * Deploy workflow to n8n
 */
async function deployWorkflowToN8n(workflow, config) {
  if (config.dryRun) {
    console.log(`${colors.yellow}🔍 DRY RUN: Workflow validation only${colors.reset}`);
    return { success: true, action: 'validated', workflow: workflow };
  }
  
  try {
    // Check if workflow already exists
    const existingWorkflow = await findExistingWorkflow(workflow.name, config);
    
    let result;
    if (existingWorkflow) {
      if (config.update) {
        console.log(`${colors.blue}🔄 Updating existing workflow: ${existingWorkflow.name}${colors.reset}`);
        result = await updateWorkflow(existingWorkflow.id, workflow, config);
        result.action = 'updated';
      } else {
        throw new Error(`Workflow "${workflow.name}" already exists. Use --update to update it.`);
      }
    } else {
      console.log(`${colors.blue}📤 Creating new workflow: ${workflow.name}${colors.reset}`);
      result = await createWorkflow(workflow, config);
      result.action = 'created';
    }
    
    // Activate workflow if requested
    if (config.activate && result.id) {
      console.log(`${colors.blue}⚡ Activating workflow...${colors.reset}`);
      await activateWorkflow(result.id, config);
      result.activated = true;
    }
    
    return result;
    
  } catch (error) {
    if (error.response) {
      const errorDetails = error.response.data || error.response;
      throw new Error(`n8n API error: ${errorDetails.message || JSON.stringify(errorDetails)}`);
    }
    throw error;
  }
}

/**
 * Find existing workflow by name
 */
async function findExistingWorkflow(workflowName, config) {
  const url = `${config.n8nUrl}/workflows`;
  
  try {
    const response = await makeRequest('GET', url, null, {
      'X-N8N-API-KEY': config.apiKey
    });
    
    const workflows = response.data || response;
    return workflows.find(w => w.name === workflowName);
    
  } catch (error) {
    if (config.verbose) {
      console.log(`${colors.yellow}Could not fetch existing workflows: ${error.message}${colors.reset}`);
    }
    return null;
  }
}

/**
 * Create new workflow
 */
async function createWorkflow(workflow, config) {
  const url = `${config.n8nUrl}/workflows`;
  
  const response = await makeRequest('POST', url, workflow, {
    'X-N8N-API-KEY': config.apiKey,
    'Content-Type': 'application/json'
  });
  
  return response.data || response;
}

/**
 * Update existing workflow
 */
async function updateWorkflow(workflowId, workflow, config) {
  const url = `${config.n8nUrl}/workflows/${workflowId}`;
  
  // Preserve the existing ID
  const updateData = { ...workflow, id: workflowId };
  
  const response = await makeRequest('PUT', url, updateData, {
    'X-N8N-API-KEY': config.apiKey,
    'Content-Type': 'application/json'
  });
  
  return response.data || response;
}

/**
 * Activate workflow
 */
async function activateWorkflow(workflowId, config) {
  const url = `${config.n8nUrl}/workflows/${workflowId}/activate`;
  
  await makeRequest('POST', url, null, {
    'X-N8N-API-KEY': config.apiKey
  });
}

/**
 * Make HTTP request
 */
function makeRequest(method, url, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: method,
      headers: headers,
      timeout: 30000
    };
    
    if (data) {
      const jsonData = JSON.stringify(data);
      options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      options.headers['Content-Type'] = options.headers['Content-Type'] || 'application/json';
    }
    
    const req = client.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            const error = new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`);
            error.response = { status: res.statusCode, data: parsedData };
            reject(error);
          }
        } catch (parseError) {
          const error = new Error(`Invalid JSON response: ${parseError.message}`);
          error.response = { status: res.statusCode, data: responseData };
          reject(error);
        }
      });
    });
    
    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });
    
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * Display deployment result
 */
function displayDeploymentResult(result, config) {
  console.log(`\n${colors.bright}📊 Deployment Results${colors.reset}\n`);
  
  if (config.dryRun) {
    console.log(`${colors.green}✓ Dry run completed successfully${colors.reset}`);
    console.log(`${colors.cyan}  Workflow: ${result.workflow.name}${colors.reset}`);
    console.log(`${colors.cyan}  Nodes: ${result.workflow.nodes?.length || 0}${colors.reset}`);
    console.log(`${colors.cyan}  Connections: ${Object.keys(result.workflow.connections || {}).length}${colors.reset}`);
    return;
  }
  
  if (result.success !== false) {
    const actionText = result.action === 'created' ? 'Created' : 'Updated';
    console.log(`${colors.green}✓ ${actionText} workflow successfully${colors.reset}`);
    
    if (result.id) {
      console.log(`${colors.cyan}  Workflow ID: ${result.id}${colors.reset}`);
    }
    
    if (result.name) {
      console.log(`${colors.cyan}  Workflow Name: ${result.name}${colors.reset}`);
    }
    
    if (result.activated) {
      console.log(`${colors.green}  ⚡ Workflow activated${colors.reset}`);
    } else if (config.activate === false) {
      console.log(`${colors.yellow}  ⏸ Workflow not activated (--no-activate specified)${colors.reset}`);
    }
    
    // Display n8n editor URL
    const editorUrl = config.n8nUrl.replace('/api/v1', `/workflow/${result.id}`);
    console.log(`${colors.blue}  🌐 Editor URL: ${editorUrl}${colors.reset}`);
    
  } else {
    console.log(`${colors.red}✗ Deployment failed${colors.reset}`);
    if (result.error) {
      console.log(`${colors.red}  Error: ${result.error}${colors.reset}`);
    }
  }
  
  console.log(`\n${colors.bright}Next Steps:${colors.reset}`);
  
  if (!config.dryRun) {
    console.log(`1. ${colors.cyan}Open the workflow in n8n editor to review${colors.reset}`);
    console.log(`2. ${colors.cyan}Configure environment variables and credentials${colors.reset}`);
    console.log(`3. ${colors.cyan}Test the workflow with manual execution${colors.reset}`);
    
    if (!result.activated) {
      console.log(`4. ${colors.cyan}Activate the workflow when ready${colors.reset}`);
    }
  } else {
    console.log(`1. ${colors.cyan}Review the validation results above${colors.reset}`);
    console.log(`2. ${colors.cyan}Run without --dry-run to deploy${colors.reset}`);
  }
}

/**
 * Create deployment configuration file
 */
function createDeploymentConfig() {
  const config = {
    n8nUrl: "http://localhost:5678",
    apiKey: "your-n8n-api-key",
    workflowFile: "ai-japan-newsletter-workflow.json",
    update: true,
    activate: true,
    timeout: 30000,
    retries: 3
  };
  
  fs.writeFileSync('deploy-config.json', JSON.stringify(config, null, 2));
  console.log(`${colors.green}✓ Created deploy-config.json${colors.reset}`);
  console.log(`${colors.yellow}Please update the configuration with your n8n details${colors.reset}`);
}

// Handle uncaught errors
process.on('unhandledRejection', (reason, promise) => {
  console.error(`${colors.red}Unhandled rejection: ${reason}${colors.reset}`);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error(`${colors.red}Uncaught exception: ${error.message}${colors.reset}`);
  process.exit(1);
});

// Run deployment if script is executed directly
if (require.main === module) {
  // Check for special commands
  const args = process.argv.slice(2);
  if (args.includes('--create-config')) {
    createDeploymentConfig();
    process.exit(0);
  }
  
  deployWorkflow().catch(error => {
    console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  deployWorkflow,
  loadWorkflowFile,
  makeRequest,
  createDeploymentConfig
}; 