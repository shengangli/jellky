/**
 * Content Extraction Combination Template
 * Combines original article data with LLM-extracted content
 */

/**
 * Combine original article data with LLM extraction results
 * @param {Object} input - n8n input data (article + extraction)
 * @returns {Array} Combined article with extracted content
 */
function combineExtraction(input) {
  try {
    const allInputs = input.all();
    
    if (allInputs.length < 2) {
      console.warn('Insufficient inputs for content extraction combination');
      return allInputs;
    }
    
    // First input should be the original article, second should be LLM response
    const articleInput = allInputs[0].json;
    const extractionInput = allInputs[1].json;
    
    // Process the extraction
    const extractedContent = processLLMExtraction(extractionInput);
    
    // Combine with original article
    const combinedArticle = combineArticleWithExtraction(articleInput, extractedContent);
    
    return [{ json: combinedArticle }];
    
  } catch (error) {
    console.error('Error combining extraction:', error);
    // Return original article if combination fails
    return input.all().length > 0 ? [input.all()[0]] : [];
  }
}

/**
 * Process LLM extraction response
 * @param {Object} extractionResponse - Raw LLM response
 * @returns {Object} Processed extraction data
 */
function processLLMExtraction(extractionResponse) {
  const extraction = {
    success: false,
    content: '',
    confidence: 0,
    metadata: {}
  };
  
  try {
    // Handle different LLM response formats
    let extractedText = '';
    
    if (extractionResponse.choices && extractionResponse.choices.length > 0) {
      // OpenAI format
      extractedText = extractionResponse.choices[0].message?.content || '';
      extraction.metadata.model = extractionResponse.model;
      extraction.metadata.usage = extractionResponse.usage;
    } else if (extractionResponse.content) {
      // Direct content format
      extractedText = extractionResponse.content;
    } else if (typeof extractionResponse === 'string') {
      // String response
      extractedText = extractionResponse;
    }
    
    // Clean and validate extracted content
    const cleanedContent = cleanExtractedContent(extractedText);
    
    if (cleanedContent && cleanedContent.length > 100) {
      extraction.success = true;
      extraction.content = cleanedContent;
      extraction.confidence = calculateExtractionConfidence(cleanedContent);
    }
    
    extraction.metadata.originalLength = extractedText.length;
    extraction.metadata.cleanedLength = cleanedContent.length;
    extraction.metadata.extractedAt = new Date().toISOString();
    
  } catch (error) {
    console.error('Error processing LLM extraction:', error);
    extraction.metadata.error = error.message;
  }
  
  return extraction;
}

/**
 * Clean extracted content
 * @param {string} content - Raw extracted content
 * @returns {string} Cleaned content
 */
function cleanExtractedContent(content) {
  if (!content) return '';
  
  return content
    .replace(/^\s*"([^"]*)"?\s*$/g, '$1')  // Remove wrapping quotes
    .replace(/^(extracted content|main content|article content):\s*/i, '') // Remove prefixes
    .replace(/\n{3,}/g, '\n\n')            // Normalize paragraph breaks
    .replace(/\s{3,}/g, ' ')               // Normalize whitespace
    .trim();
}

/**
 * Calculate confidence score for extracted content
 * @param {string} content - Extracted content
 * @returns {number} Confidence score (0-1)
 */
function calculateExtractionConfidence(content) {
  if (!content) return 0;
  
  let confidence = 0.5; // Base confidence
  
  // Length indicators
  if (content.length > 500) confidence += 0.2;
  if (content.length > 1000) confidence += 0.1;
  if (content.length < 100) confidence -= 0.3;
  
  // Structure indicators
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length > 3) confidence += 0.1;
  if (sentences.length > 10) confidence += 0.1;
  
  // Content quality indicators
  const words = content.split(/\s+/);
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  if (avgWordLength > 4) confidence += 0.1; // Indicates substantive content
  
  // Negative indicators
  if (content.includes('unable to extract') || 
      content.includes('cannot find') ||
      content.includes('no content available')) {
    confidence -= 0.4;
  }
  
  if (content.includes('description instead') || 
      content.includes('using description')) {
    confidence -= 0.2;
  }
  
  // HTML/formatting indicators (bad)
  if (content.includes('<') || content.includes('{') || content.includes('[')) {
    confidence -= 0.2;
  }
  
  return Math.max(0, Math.min(1, confidence));
}

/**
 * Combine original article with extraction results
 * @param {Object} article - Original article data
 * @param {Object} extraction - Extraction results
 * @returns {Object} Combined article
 */
function combineArticleWithExtraction(article, extraction) {
  const combined = {
    ...article,
    extractionResults: extraction
  };
  
  // Determine best content to use
  if (extraction.success && extraction.confidence > 0.5) {
    combined.fullContent = extraction.content;
    combined.extractionSuccess = true;
    combined.contentSource = 'llm_extraction';
  } else {
    // Fall back to original content or description
    combined.fullContent = article.content || article.description || '';
    combined.extractionSuccess = false;
    combined.contentSource = article.content ? 'original_content' : 'description';
  }
  
  // Add quality metrics
  combined.contentQuality = assessContentQuality(combined.fullContent);
  combined.contentLength = combined.fullContent.length;
  
  // Preserve extraction metadata
  combined.extractionMetadata = {
    attempted: true,
    success: extraction.success,
    confidence: extraction.confidence,
    ...extraction.metadata
  };
  
  return combined;
}

/**
 * Assess overall content quality
 * @param {string} content - Content to assess
 * @returns {Object} Quality assessment
 */
function assessContentQuality(content) {
  if (!content) {
    return {
      score: 0,
      level: 'poor',
      reasons: ['No content available']
    };
  }
  
  const assessment = {
    score: 0,
    level: 'poor',
    reasons: []
  };
  
  const words = content.split(/\s+/).filter(word => word.length > 0);
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  // Length scoring
  if (words.length > 100) {
    assessment.score += 0.3;
    assessment.reasons.push('Sufficient length');
  } else if (words.length < 50) {
    assessment.reasons.push('Content too short');
  }
  
  // Structure scoring
  if (sentences.length > 5) {
    assessment.score += 0.2;
    assessment.reasons.push('Good sentence structure');
  }
  
  if (paragraphs.length > 2) {
    assessment.score += 0.1;
    assessment.reasons.push('Multi-paragraph content');
  }
  
  // Content depth scoring
  const avgWordsPerSentence = words.length / Math.max(sentences.length, 1);
  if (avgWordsPerSentence > 10 && avgWordsPerSentence < 30) {
    assessment.score += 0.1;
    assessment.reasons.push('Appropriate sentence complexity');
  }
  
  // Vocabulary scoring
  const uniqueWords = new Set(words.map(w => w.toLowerCase()));
  const vocabularyRatio = uniqueWords.size / words.length;
  if (vocabularyRatio > 0.5) {
    assessment.score += 0.1;
    assessment.reasons.push('Rich vocabulary');
  }
  
  // Technical content indicators
  const technicalTerms = [
    'artificial intelligence', 'machine learning', 'neural network',
    'algorithm', 'data', 'research', 'technology', 'innovation',
    'development', 'system', 'platform', 'software', 'hardware'
  ];
  
  const technicalTermCount = technicalTerms.filter(term => 
    content.toLowerCase().includes(term)
  ).length;
  
  if (technicalTermCount > 2) {
    assessment.score += 0.2;
    assessment.reasons.push('Contains technical content');
  }
  
  // Determine quality level
  if (assessment.score >= 0.8) {
    assessment.level = 'excellent';
  } else if (assessment.score >= 0.6) {
    assessment.level = 'good';
  } else if (assessment.score >= 0.4) {
    assessment.level = 'fair';
  } else if (assessment.score >= 0.2) {
    assessment.level = 'poor';
  } else {
    assessment.level = 'very_poor';
  }
  
  return assessment;
}

/**
 * Handle extraction failures gracefully
 * @param {Object} article - Original article
 * @param {string} errorMessage - Error message
 * @returns {Object} Article with fallback content
 */
function handleExtractionFailure(article, errorMessage) {
  console.warn(`Content extraction failed for article: ${article.title}. Error: ${errorMessage}`);
  
  return {
    ...article,
    fullContent: article.content || article.description || article.title,
    extractionSuccess: false,
    contentSource: 'fallback',
    extractionMetadata: {
      attempted: true,
      success: false,
      error: errorMessage,
      fallbackUsed: true
    },
    contentQuality: assessContentQuality(article.content || article.description || article.title)
  };
}

/**
 * Validate extraction combination result
 * @param {Object} combinedArticle - Combined article result
 * @returns {boolean} Is valid result
 */
function validateCombinedResult(combinedArticle) {
  // Must have basic article properties
  if (!combinedArticle.title || !combinedArticle.url) {
    return false;
  }
  
  // Must have some content
  if (!combinedArticle.fullContent || combinedArticle.fullContent.length < 20) {
    return false;
  }
  
  // Must have extraction metadata
  if (!combinedArticle.extractionMetadata) {
    return false;
  }
  
  return true;
}

module.exports = {
  combineExtraction,
  processLLMExtraction,
  cleanExtractedContent,
  calculateExtractionConfidence,
  combineArticleWithExtraction,
  assessContentQuality,
  handleExtractionFailure,
  validateCombinedResult
}; 