#!/usr/bin/env node

/**
 * Workflow Validation Script
 * Validates n8n workflow JSON for structure, connectivity, and compatibility
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Main validation function
 */
async function validateWorkflow() {
  console.log(`${colors.cyan}${colors.bright}🔍 n8n Workflow Validator${colors.reset}\n`);
  
  try {
    // Parse command line arguments
    const args = parseArguments();
    
    // Load workflow file
    const workflow = loadWorkflowFile(args.file);
    
    // Run validation checks
    const results = await runValidationChecks(workflow, args);
    
    // Display results
    displayResults(results);
    
    // Exit with appropriate code
    const hasErrors = results.some(result => result.level === 'error');
    process.exit(hasErrors ? 1 : 0);
    
  } catch (error) {
    console.error(`${colors.red}Fatal Error: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    file: 'ai-japan-newsletter-workflow.json',
    checkEnv: false,
    checkStructure: true,
    checkNodes: true,
    checkConnections: true,
    verbose: false
  };
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
      case '-f':
        options.file = args[++i];
        break;
      case '--check-env':
        options.checkEnv = true;
        break;
      case '--validate-structure':
        options.checkStructure = true;
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
  console.log(`${colors.cyan}n8n Workflow Validator${colors.reset}

${colors.bright}Usage:${colors.reset}
  node validate-workflow.js [options]

${colors.bright}Options:${colors.reset}
  -f, --file <file>        Workflow JSON file to validate (default: ai-japan-newsletter-workflow.json)
  --check-env             Check environment variables configuration
  --validate-structure    Validate workflow structure (default: true)
  --verbose, -v           Show detailed validation output
  -h, --help              Show this help message

${colors.bright}Examples:${colors.reset}
  node validate-workflow.js
  node validate-workflow.js --file my-workflow.json --verbose
  node validate-workflow.js --check-env
`);
}

/**
 * Load and parse workflow file
 */
function loadWorkflowFile(filename) {
  console.log(`📁 Loading workflow file: ${colors.bright}${filename}${colors.reset}`);
  
  if (!fs.existsSync(filename)) {
    throw new Error(`Workflow file not found: ${filename}`);
  }
  
  try {
    const content = fs.readFileSync(filename, 'utf8');
    const workflow = JSON.parse(content);
    
    console.log(`${colors.green}✓${colors.reset} Workflow file loaded successfully\n`);
    return workflow;
    
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in workflow file: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Run all validation checks
 */
async function runValidationChecks(workflow, options) {
  const results = [];
  
  console.log(`${colors.bright}🔍 Running Validation Checks...${colors.reset}\n`);
  
  // Basic structure validation
  if (options.checkStructure) {
    results.push(...validateWorkflowStructure(workflow));
  }
  
  // Node validation
  if (options.checkNodes) {
    results.push(...validateNodes(workflow));
  }
  
  // Connection validation
  if (options.checkConnections) {
    results.push(...validateConnections(workflow));
  }
  
  // Environment variables check
  if (options.checkEnv) {
    results.push(...validateEnvironmentVariables(workflow));
  }
  
  // Template files validation
  results.push(...validateTemplateFiles());
  
  // Configuration validation
  results.push(...validateConfiguration());
  
  return results;
}

/**
 * Validate basic workflow structure
 */
function validateWorkflowStructure(workflow) {
  const results = [];
  
  console.log(`${colors.blue}📋 Validating workflow structure...${colors.reset}`);
  
  // Required top-level properties
  const requiredProps = ['name', 'nodes', 'connections'];
  const recommendedProps = ['settings', 'meta'];
  
  requiredProps.forEach(prop => {
    if (!workflow.hasOwnProperty(prop)) {
      results.push({
        level: 'error',
        category: 'structure',
        message: `Missing required property: ${prop}`,
        details: 'This property is required for n8n to import the workflow'
      });
    }
  });
  
  recommendedProps.forEach(prop => {
    if (!workflow.hasOwnProperty(prop)) {
      results.push({
        level: 'warning',
        category: 'structure',
        message: `Missing recommended property: ${prop}`,
        details: 'This property is recommended for better workflow management'
      });
    }
  });
  
  // Validate workflow name
  if (workflow.name && typeof workflow.name !== 'string') {
    results.push({
      level: 'error',
      category: 'structure',
      message: 'Workflow name must be a string',
      details: 'The name property should contain a descriptive workflow name'
    });
  }
  
  // Validate nodes array
  if (workflow.nodes && !Array.isArray(workflow.nodes)) {
    results.push({
      level: 'error',
      category: 'structure',
      message: 'Nodes property must be an array',
      details: 'The nodes property should contain an array of node objects'
    });
  }
  
  // Validate connections object
  if (workflow.connections && typeof workflow.connections !== 'object') {
    results.push({
      level: 'error',
      category: 'structure',
      message: 'Connections property must be an object',
      details: 'The connections property should contain node connection mappings'
    });
  }
  
  return results;
}

/**
 * Validate individual nodes
 */
function validateNodes(workflow) {
  const results = [];
  
  console.log(`${colors.blue}🔗 Validating nodes...${colors.reset}`);
  
  if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
    return [{ level: 'error', category: 'nodes', message: 'No nodes array found' }];
  }
  
  const nodeIds = new Set();
  const nodeTypes = {};
  
  workflow.nodes.forEach((node, index) => {
    // Required node properties
    const requiredProps = ['id', 'name', 'type', 'typeVersion', 'position'];
    
    requiredProps.forEach(prop => {
      if (!node.hasOwnProperty(prop)) {
        results.push({
          level: 'error',
          category: 'nodes',
          message: `Node ${index}: Missing required property '${prop}'`,
          details: `Node: ${node.name || node.id || 'Unknown'}`
        });
      }
    });
    
    // Check for duplicate node IDs
    if (node.id) {
      if (nodeIds.has(node.id)) {
        results.push({
          level: 'error',
          category: 'nodes',
          message: `Duplicate node ID: ${node.id}`,
          details: 'Node IDs must be unique within the workflow'
        });
      }
      nodeIds.add(node.id);
    }
    
    // Track node types
    if (node.type) {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    }
    
    // Validate node position
    if (node.position) {
      if (!Array.isArray(node.position) || node.position.length !== 2) {
        results.push({
          level: 'error',
          category: 'nodes',
          message: `Node ${node.id}: Invalid position format`,
          details: 'Position should be an array with [x, y] coordinates'
        });
      }
    }
    
    // Check for template file references
    if (node.parameters && node.parameters.jsCode) {
      const code = node.parameters.jsCode;
      if (code.includes("require('./templates/")) {
        const templateMatch = code.match(/require\('\.\/templates\/([^']+)'\)/);
        if (templateMatch) {
          const templateFile = `templates/${templateMatch[1]}`;
          if (!fs.existsSync(templateFile)) {
            results.push({
              level: 'warning',
              category: 'nodes',
              message: `Node ${node.id}: Referenced template file not found: ${templateFile}`,
              details: 'Template files should exist for proper functionality'
            });
          }
        }
      }
    }
  });
  
  // Check for required node types
  const requiredNodeTypes = [
    'n8n-nodes-base.scheduleTrigger',
    'n8n-nodes-base.httpRequest',
    'n8n-nodes-base.code',
    'n8n-nodes-base.github'
  ];
  
  requiredNodeTypes.forEach(type => {
    if (!nodeTypes[type]) {
      results.push({
        level: 'warning',
        category: 'nodes',
        message: `Missing recommended node type: ${type}`,
        details: 'This node type is typically required for the workflow to function properly'
      });
    }
  });
  
  return results;
}

/**
 * Validate node connections
 */
function validateConnections(workflow) {
  const results = [];
  
  console.log(`${colors.blue}🔗 Validating connections...${colors.reset}`);
  
  if (!workflow.connections || !workflow.nodes) {
    return [{ level: 'error', category: 'connections', message: 'Missing connections or nodes data' }];
  }
  
  const nodeIds = new Set(workflow.nodes.map(node => node.id));
  
  // Validate each connection
  Object.entries(workflow.connections).forEach(([sourceNodeId, outputs]) => {
    // Check if source node exists
    if (!nodeIds.has(sourceNodeId)) {
      results.push({
        level: 'error',
        category: 'connections',
        message: `Connection references non-existent source node: ${sourceNodeId}`,
        details: 'All connection source nodes must exist in the nodes array'
      });
      return;
    }
    
    // Validate output connections
    Object.entries(outputs).forEach(([outputType, connections]) => {
      if (!Array.isArray(connections)) {
        results.push({
          level: 'error',
          category: 'connections',
          message: `Invalid connection format for node ${sourceNodeId}`,
          details: 'Connections should be arrays of connection objects'
        });
        return;
      }
      
      connections.forEach((connectionArray, index) => {
        if (!Array.isArray(connectionArray)) {
          results.push({
            level: 'error',
            category: 'connections',
            message: `Invalid connection array format for node ${sourceNodeId}`,
            details: 'Each connection should be an array of connection objects'
          });
          return;
        }
        
        connectionArray.forEach(connection => {
          // Validate connection object structure
          if (!connection.node || !connection.type) {
            results.push({
              level: 'error',
              category: 'connections',
              message: `Invalid connection object from ${sourceNodeId}`,
              details: 'Connection objects must have "node" and "type" properties'
            });
            return;
          }
          
          // Check if target node exists
          if (!nodeIds.has(connection.node)) {
            results.push({
              level: 'error',
              category: 'connections',
              message: `Connection references non-existent target node: ${connection.node}`,
              details: `Source node: ${sourceNodeId}`
            });
          }
        });
      });
    });
  });
  
  // Check for orphaned nodes (nodes with no incoming or outgoing connections)
  const connectedNodes = new Set();
  
  // Add source nodes
  Object.keys(workflow.connections).forEach(nodeId => {
    connectedNodes.add(nodeId);
  });
  
  // Add target nodes
  Object.values(workflow.connections).forEach(outputs => {
    Object.values(outputs).forEach(connections => {
      connections.forEach(connectionArray => {
        connectionArray.forEach(connection => {
          connectedNodes.add(connection.node);
        });
      });
    });
  });
  
  workflow.nodes.forEach(node => {
    if (!connectedNodes.has(node.id) && node.type !== 'n8n-nodes-base.scheduleTrigger') {
      results.push({
        level: 'warning',
        category: 'connections',
        message: `Orphaned node detected: ${node.id} (${node.name})`,
        details: 'Node has no incoming or outgoing connections'
      });
    }
  });
  
  return results;
}

/**
 * Validate environment variables
 */
function validateEnvironmentVariables(workflow) {
  const results = [];
  
  console.log(`${colors.blue}🌍 Validating environment variables...${colors.reset}`);
  
  // Required environment variables
  const requiredVars = [
    'NEWS_API_KEY',
    'OPENAI_API_KEY',
    'GITHUB_OWNER',
    'GITHUB_REPO'
  ];
  
  const recommendedVars = [
    'WEBSITE_BASE_URL',
    'NEWS_API_PAGE_SIZE',
    'SLACK_CHANNEL',
    'EMAIL_FROM',
    'EMAIL_TO'
  ];
  
  // Check if variables are referenced in the workflow
  const workflowString = JSON.stringify(workflow);
  const referencedVars = new Set();
  
  // Find variable references
  const varMatches = workflowString.match(/\{\{\s*\$vars\.([A-Z_]+)\s*\}\}/g) || [];
  varMatches.forEach(match => {
    const varName = match.match(/\$vars\.([A-Z_]+)/)[1];
    referencedVars.add(varName);
  });
  
  // Check required variables
  requiredVars.forEach(varName => {
    if (!referencedVars.has(varName)) {
      results.push({
        level: 'warning',
        category: 'environment',
        message: `Required environment variable not referenced: ${varName}`,
        details: 'This variable should be configured in n8n settings'
      });
    }
  });
  
  // Check for hardcoded values that should be environment variables
  const hardcodedPatterns = [
    { pattern: /"YOUR_[A-Z_]+_KEY"/, message: 'Hardcoded placeholder API key found' },
    { pattern: /"your-email@example\.com"/, message: 'Hardcoded placeholder email found' },
    { pattern: /"#[a-z-]+"/, message: 'Hardcoded Slack channel found' }
  ];
  
  hardcodedPatterns.forEach(({ pattern, message }) => {
    if (pattern.test(workflowString)) {
      results.push({
        level: 'warning',
        category: 'environment',
        message: message,
        details: 'Consider using environment variables for configuration values'
      });
    }
  });
  
  return results;
}

/**
 * Validate template files exist
 */
function validateTemplateFiles() {
  const results = [];
  
  console.log(`${colors.blue}📄 Validating template files...${colors.reset}`);
  
  const requiredTemplates = [
    'templates/rss-sources.js',
    'templates/process-newsapi.js',
    'templates/process-rss.js',
    'templates/process-reddit.js',
    'templates/deduplicate.js',
    'templates/combine-extraction.js',
    'templates/select-best.js',
    'templates/format-post.js'
  ];
  
  requiredTemplates.forEach(templatePath => {
    if (!fs.existsSync(templatePath)) {
      results.push({
        level: 'error',
        category: 'templates',
        message: `Missing template file: ${templatePath}`,
        details: 'Template files are required for workflow functionality'
      });
    } else {
      // Basic syntax check
      try {
        const content = fs.readFileSync(templatePath, 'utf8');
        if (!content.includes('module.exports')) {
          results.push({
            level: 'warning',
            category: 'templates',
            message: `Template file ${templatePath} missing module.exports`,
            details: 'Template files should export their functions'
          });
        }
      } catch (error) {
        results.push({
          level: 'error',
          category: 'templates',
          message: `Error reading template file: ${templatePath}`,
          details: error.message
        });
      }
    }
  });
  
  return results;
}

/**
 * Validate configuration files
 */
function validateConfiguration() {
  const results = [];
  
  console.log(`${colors.blue}⚙️ Validating configuration files...${colors.reset}`);
  
  // Check workflow-config.json
  if (fs.existsSync('workflow-config.json')) {
    try {
      const configContent = fs.readFileSync('workflow-config.json', 'utf8');
      const config = JSON.parse(configContent);
      
      // Validate configuration structure
      const requiredSections = ['workflow', 'dataSources', 'contentProcessing', 'newsletter', 'publishing'];
      requiredSections.forEach(section => {
        if (!config[section]) {
          results.push({
            level: 'warning',
            category: 'configuration',
            message: `Missing configuration section: ${section}`,
            details: 'Configuration sections help organize workflow settings'
          });
        }
      });
      
    } catch (error) {
      results.push({
        level: 'error',
        category: 'configuration',
        message: 'Invalid workflow-config.json',
        details: error.message
      });
    }
  } else {
    results.push({
      level: 'warning',
      category: 'configuration',
      message: 'Missing workflow-config.json',
      details: 'Configuration file helps with workflow customization'
    });
  }
  
  return results;
}

/**
 * Display validation results
 */
function displayResults(results) {
  console.log(`\n${colors.bright}📊 Validation Results${colors.reset}\n`);
  
  const errorCount = results.filter(r => r.level === 'error').length;
  const warningCount = results.filter(r => r.level === 'warning').length;
  const infoCount = results.filter(r => r.level === 'info').length;
  
  // Summary
  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log(`  ${colors.red}❌ Errors: ${errorCount}${colors.reset}`);
  console.log(`  ${colors.yellow}⚠️  Warnings: ${warningCount}${colors.reset}`);
  console.log(`  ${colors.blue}ℹ️  Info: ${infoCount}${colors.reset}`);
  
  if (results.length === 0) {
    console.log(`\n${colors.green}${colors.bright}✅ All validations passed!${colors.reset}`);
    return;
  }
  
  // Group by category
  const categories = {};
  results.forEach(result => {
    if (!categories[result.category]) {
      categories[result.category] = [];
    }
    categories[result.category].push(result);
  });
  
  // Display by category
  Object.entries(categories).forEach(([category, items]) => {
    console.log(`\n${colors.bright}${category.toUpperCase()}:${colors.reset}`);
    
    items.forEach(item => {
      const icon = item.level === 'error' ? '❌' : item.level === 'warning' ? '⚠️' : 'ℹ️';
      const color = item.level === 'error' ? colors.red : item.level === 'warning' ? colors.yellow : colors.blue;
      
      console.log(`  ${icon} ${color}${item.message}${colors.reset}`);
      if (item.details) {
        console.log(`     ${colors.cyan}${item.details}${colors.reset}`);
      }
    });
  });
  
  // Final status
  if (errorCount > 0) {
    console.log(`\n${colors.red}${colors.bright}❌ Validation failed with ${errorCount} error(s)${colors.reset}`);
    console.log(`${colors.yellow}Fix errors before importing to n8n${colors.reset}`);
  } else if (warningCount > 0) {
    console.log(`\n${colors.yellow}${colors.bright}⚠️  Validation completed with ${warningCount} warning(s)${colors.reset}`);
    console.log(`${colors.green}Workflow can be imported but consider addressing warnings${colors.reset}`);
  } else {
    console.log(`\n${colors.green}${colors.bright}✅ Validation successful!${colors.reset}`);
  }
}

// Run validation if script is executed directly
if (require.main === module) {
  validateWorkflow().catch(error => {
    console.error(`${colors.red}Unexpected error: ${error.message}${colors.reset}`);
    process.exit(1);
  });
}

module.exports = {
  validateWorkflow,
  validateWorkflowStructure,
  validateNodes,
  validateConnections,
  validateEnvironmentVariables,
  validateTemplateFiles,
  validateConfiguration
}; 