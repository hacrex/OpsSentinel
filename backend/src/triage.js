const axios = require('axios');
const logger = require('./logger');

// In-memory cache for CODEOWNERS files (per repo)
const codeownersCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Parse CODEOWNERS file content into a map of pattern -> owners
function parseCodeowners(content) {
  const rules = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // CODEOWNERS format: pattern @owner1 @owner2
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) continue;
    
    const pattern = parts[0];
    const owners = parts.slice(1)
      .filter(p => p.startsWith('@'))
      .map(p => p.substring(1)); // Remove @ prefix
    
    if (owners.length > 0) {
      rules.push({ pattern, owners });
    }
  }
  
  return rules;
}

// Match a file path against CODEOWNERS patterns
function matchFileToOwners(filePath, rules) {
  // Sort rules by specificity (more specific patterns first)
  const sortedRules = [...rules].sort((a, b) => {
    // Longer patterns are more specific
    const aDepth = (a.pattern.match(/\//g) || []).length;
    const bDepth = (b.pattern.match(/\//g) || []).length;
    return bDepth - aDepth;
  });
  
  for (const rule of sortedRules) {
    const pattern = rule.pattern;
    
    // Exact file match
    if (filePath === pattern) {
      return rule.owners;
    }
    
    // Directory match (pattern ends with /)
    if (pattern.endsWith('/')) {
      if (filePath.startsWith(pattern)) {
        return rule.owners;
      }
    }
    
    // Wildcard match
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      if (regex.test(filePath)) {
        return rule.owners;
      }
    }
    
    // Glob-style match (e.g., *.js)
    if (pattern.startsWith('*.')) {
      const ext = pattern.substring(1); // .js
      if (filePath.endsWith(ext)) {
        return rule.owners;
      }
    }
  }
  
  return [];
}

// Fetch CODEOWNERS file from GitHub
async function fetchCodeowners(owner, repo, token) {
  const cacheKey = `${owner}/${repo}`;
  const cached = codeownersCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.rules;
  }
  
  try {
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    // Try common locations for CODEOWNERS
    const locations = [
      'CODEOWNERS',
      '.github/CODEOWNERS',
      'docs/CODEOWNERS',
    ];
    
    for (const path of locations) {
      try {
        const res = await axios.get(
          `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
          { headers }
        );
        
        if (res.data && res.data.content) {
          const content = Buffer.from(res.data.content, 'base64').toString('utf-8');
          const rules = parseCodeowners(content);
          codeownersCache.set(cacheKey, { rules, timestamp: Date.now() });
          logger.info({ repo: cacheKey, rulesCount: rules.length }, 'Fetched CODEOWNERS');
          return rules;
        }
      } catch (err) {
        // File not found at this location, try next
        if (err.response?.status !== 404) {
          logger.warn({ err, path }, 'Error fetching CODEOWNERS');
        }
      }
    }
    
    // No CODEOWNERS file found
    codeownersCache.set(cacheKey, { rules: [], timestamp: Date.now() });
    return [];
  } catch (err) {
    logger.error({ err, repo: cacheKey }, 'Failed to fetch CODEOWNERS');
    return [];
  }
}

// Fetch recent commits for a workflow run
async function fetchRecentCommits(owner, repo, runId, token) {
  try {
    const headers = { Accept: 'application/vnd.github+json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    // Get workflow run details to find the head SHA
    const runRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}`,
      { headers }
    );
    
    const headSha = runRes.data.head_sha;
    
    // Get commits for this run
    const commitsRes = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/commits`,
      { headers }
    );
    
    return commitsRes.data.commits || [];
  } catch (err) {
    logger.error({ err, owner, repo, runId }, 'Failed to fetch commits');
    return [];
  }
}

// Triage a failed workflow run
async function triageFailure({ owner, repo, runId, workflowName, token }) {
  const result = {
    assignees: [],
    source: null,
    confidence: 0,
    details: {},
  };
  
  try {
    // Fetch CODEOWNERS
    const codeownersRules = await fetchCodeowners(owner, repo, token);
    result.details.codeownersRules = codeownersRules.length;
    
    if (codeownersRules.length > 0) {
      // Fetch recent commits
      const commits = await fetchRecentCommits(owner, repo, runId, token);
      result.details.recentCommits = commits.length;
      
      if (commits.length > 0) {
        // Get changed files from commits
        const changedFiles = new Set();
        
        for (const commit of commits.slice(0, 5)) { // Last 5 commits
          try {
            const filesRes = await axios.get(
              `https://api.github.com/repos/${owner}/${repo}/commits/${commit.sha}`,
              { headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}` } }
            );
            
            const files = filesRes.data.files || [];
            for (const file of files) {
              changedFiles.add(file.filename);
            }
          } catch (err) {
            logger.warn({ err, sha: commit.sha }, 'Failed to fetch commit details');
          }
        }
        
        result.details.changedFiles = changedFiles.size;
        
        // Match changed files against CODEOWNERS
        const ownerMap = new Map();
        
        for (const file of changedFiles) {
          const owners = matchFileToOwners(file, codeownersRules);
          for (const owner of owners) {
            ownerMap.set(owner, (ownerMap.get(owner) || 0) + 1);
          }
        }
        
        if (ownerMap.size > 0) {
          // Sort owners by number of files they own
          const sortedOwners = [...ownerMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([owner, count]) => ({ owner, fileCount: count }));
          
          result.assignees = sortedOwners.map(o => o.owner);
          result.source = 'codeowners';
          result.confidence = Math.min(0.9, 0.5 + (sortedOwners[0].fileCount * 0.1));
          result.details.topOwner = sortedOwners[0];
        }
      }
    }
    
    // If no CODEOWNERS match, try to assign based on commit authors
    if (result.assignees.length === 0) {
      const commits = await fetchRecentCommits(owner, repo, runId, token);
      
      if (commits.length > 0) {
        const authorMap = new Map();
        
        for (const commit of commits) {
          const author = commit.author?.login || commit.committer?.login;
          if (author) {
            authorMap.set(author, (authorMap.get(author) || 0) + 1);
          }
        }
        
        if (authorMap.size > 0) {
          const sortedAuthors = [...authorMap.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([author, count]) => ({ author, commitCount: count }));
          
          result.assignees = sortedAuthors.map(a => a.author);
          result.source = 'commits';
          result.confidence = Math.min(0.7, 0.3 + (sortedAuthors[0].commitCount * 0.1));
          result.details.topAuthor = sortedAuthors[0];
        }
      }
    }
    
  } catch (err) {
    logger.error({ err, owner, repo, runId }, 'Triage failed');
  }
  
  return result;
}

module.exports = {
  fetchCodeowners,
  parseCodeowners,
  matchFileToOwners,
  triageFailure,
};
