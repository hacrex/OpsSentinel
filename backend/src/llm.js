const axios = require('axios');
const logger = require('./logger');

// Supported LLM providers
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    headers: (apiKey) => ({
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    }),
  },
  anthropic: {
    name: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-haiku-20240307',
    headers: (apiKey) => ({
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
    }),
  },
};

// Get LLM config from environment
function getLLMConfig() {
  const provider = process.env.LLM_PROVIDER || 'openai';
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    return null;
  }
  
  return {
    provider,
    apiKey,
    model: process.env.LLM_MODEL || PROVIDERS[provider]?.model,
  };
}

// Extract error logs from GitHub Actions workflow logs
function extractErrorLogs(logContent) {
  if (!logContent) return [];
  
  const lines = logContent.split('\n');
  const errors = [];
  const errorPatterns = [
    /error:/i,
    /failed/i,
    /exception/i,
    /fatal/i,
    /panic/i,
    /ERRO/,
    /FAILURE/,
    /exit code [1-9]/,
    /non-zero exit/,
  ];
  
  let capturing = false;
  let contextBuffer = [];
  const CONTEXT_LINES = 3;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isError = errorPatterns.some(p => p.test(line));
    
    if (isError) {
      // Add context lines before the error
      const start = Math.max(0, i - CONTEXT_LINES);
      for (let j = start; j < i; j++) {
        if (!contextBuffer.includes(lines[j])) {
          errors.push(lines[j]);
        }
      }
      errors.push(line);
      capturing = true;
    } else if (capturing) {
      errors.push(line);
      if (errors.length > 50) { // Limit context
        capturing = false;
      }
    }
  }
  
  // If no errors found, return last 20 lines as context
  if (errors.length === 0) {
    return lines.slice(-20);
  }
  
  return errors.slice(0, 100); // Limit to 100 lines
}

// Fetch workflow run logs from GitHub
async function fetchWorkflowLogs(owner, repo, runId, token) {
  try {
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    // Get jobs for the run
    const jobsRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/jobs`,
      { headers }
    );
    
    const jobs = jobsRes.data.jobs || [];
    const failedJobs = jobs.filter(j => j.conclusion === 'failure');
    
    if (failedJobs.length === 0) {
      return { jobs: jobs.length, failedJobs: 0, logs: '' };
    }
    
    // Fetch logs for failed jobs (limited to first failed job for now)
    const failedJob = failedJobs[0];
    const logsRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/actions/jobs/${failedJob.id}/logs`,
      { 
        headers,
        responseType: 'text',
        maxContentLength: 10 * 1024 * 1024, // 10MB limit
      }
    );
    
    return {
      jobs: jobs.length,
      failedJobs: failedJobs.length,
      failedJobName: failedJob.name,
      logs: logsRes.data,
    };
  } catch (err) {
    logger.error({ err, owner, repo, runId }, 'Failed to fetch workflow logs');
    return { jobs: 0, failedJobs: 0, logs: '', error: err.message };
  }
}

// Analyze logs using LLM
async function analyzeWithLLM(logs, context = {}) {
  const config = getLLMConfig();
  
  if (!config) {
    return {
      success: false,
      error: 'LLM not configured. Set LLM_API_KEY environment variable.',
      summary: null,
    };
  }
  
  const provider = PROVIDERS[config.provider];
  if (!provider) {
    return {
      success: false,
      error: `Unsupported LLM provider: ${config.provider}`,
      summary: null,
    };
  }
  
  const errorLogs = extractErrorLogs(logs);
  const logContent = errorLogs.join('\n').substring(0, 4000); // Limit for token usage
  
  const prompt = `You are a CI/CD failure analyst. Analyze the following workflow failure logs and provide a concise summary.

Repository: ${context.repo || 'unknown'}
Workflow: ${context.workflow || 'unknown'}
Failed Job: ${context.job || 'unknown'}

Error Logs:
\`\`\`
${logContent}
\`\`\`

Provide your analysis in this exact JSON format:
{
  "root_cause": "One-line summary of the root cause",
  "category": "one of: test_failure, build_error, dependency_issue, configuration_error, infrastructure_issue, permission_error, resource_limit, other",
  "suggested_fix": "Brief suggestion for fixing the issue",
  "confidence": 0.0-1.0,
  "key_errors": ["list", "of", "key", "error", "messages"]
}

Only return the JSON object, no additional text.`;

  try {
    let response;
    
    if (config.provider === 'openai') {
      const res = await axios.post(
        provider.endpoint,
        {
          model: config.model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 500,
        },
        { headers: provider.headers(config.apiKey) }
      );
      response = res.data.choices[0].message.content;
    } else if (config.provider === 'anthropic') {
      const res = await axios.post(
        provider.endpoint,
        {
          model: config.model,
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        },
        { headers: provider.headers(config.apiKey) }
      );
      response = res.data.content[0].text;
    }
    
    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return {
        success: true,
        summary: analysis,
      };
    }
    
    return {
      success: false,
      error: 'Failed to parse LLM response',
      raw: response,
    };
  } catch (err) {
    logger.error({ err }, 'LLM analysis failed');
    return {
      success: false,
      error: err.message,
    };
  }
}

// Main function: analyze a failed workflow run
async function analyzeFailure({ owner, repo, runId, token }) {
  const context = { repo: `${owner}/${repo}` };
  
  // Fetch workflow logs
  const logData = await fetchWorkflowLogs(owner, repo, runId, token);
  
  if (logData.error) {
    return {
      success: false,
      error: `Failed to fetch logs: ${logData.error}`,
    };
  }
  
  if (!logData.logs) {
    return {
      success: false,
      error: 'No logs available for this workflow run',
    };
  }
  
  context.job = logData.failedJobName;
  
  // Analyze with LLM
  const analysis = await analyzeWithLLM(logData.logs, context);
  
  return {
    success: analysis.success,
    summary: analysis.summary,
    error: analysis.error,
    metadata: {
      jobs: logData.jobs,
      failedJobs: logData.failedJobs,
      failedJobName: logData.failedJobName,
      logLines: logData.logs.split('\n').length,
    },
  };
}

module.exports = {
  getLLMConfig,
  extractErrorLogs,
  fetchWorkflowLogs,
  analyzeWithLLM,
  analyzeFailure,
};
