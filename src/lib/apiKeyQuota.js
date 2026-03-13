/**
 * API Key Quota Management
 * 
 * Handles daily/monthly quota tracking for API keys
 * Stored in db.json alongside API keys for atomic updates
 */

import { getDb } from "./localDb.js";

/**
 * Check if quota limit is exceeded
 * @param {object} apiKey - API key object with quota fields
 * @returns {{ allowed: boolean, remaining?: number, resetAt?: string, limit?: number }}
 */
export function checkQuotaLimit(apiKey) {
  // No quota = unlimited
  if (!apiKey?.quota || !apiKey.quota.dailyLimit) {
    return { allowed: true };
  }

  const now = new Date();
  const quota = apiKey.quota;
  
  // Check if quota needs reset (new day)
  const resetAt = quota.resetAt ? new Date(quota.resetAt) : null;
  if (!resetAt || now >= resetAt) {
    // Quota expired or not set - reset counters
    return { 
      allowed: true, 
      shouldReset: true,
      nextResetAt: getNextResetTime()
    };
  }

  // Check daily limit
  const dailyUsed = quota.dailyUsed || 0;
  const dailyLimit = quota.dailyLimit;
  
  if (dailyUsed >= dailyLimit) {
    return {
      allowed: false,
      remaining: 0,
      limit: dailyLimit,
      used: dailyUsed,
      resetAt: resetAt.toISOString(),
      resetInMs: resetAt.getTime() - now.getTime()
    };
  }

  // Check monthly limit (if configured)
  if (quota.monthlyLimit) {
    const monthlyUsed = quota.monthlyUsed || 0;
    if (monthlyUsed >= quota.monthlyLimit) {
      return {
        allowed: false,
        remaining: 0,
        limit: quota.monthlyLimit,
        used: monthlyUsed,
        resetAt: quota.monthlyResetAt,
        period: 'monthly'
      };
    }
  }

  return {
    allowed: true,
    remaining: dailyLimit - dailyUsed,
    limit: dailyLimit,
    used: dailyUsed,
    resetAt: resetAt.toISOString()
  };
}

/**
 * Increment API key usage counter
 * @param {string} apiKeyId - API key ID
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function incrementApiKeyUsage(apiKeyId) {
  try {
    const db = await getDb();
    const apiKeyIndex = db.data.apiKeys.findIndex(k => k.id === apiKeyId);
    
    if (apiKeyIndex === -1) {
      return { success: false, error: 'API key not found' };
    }

    const apiKey = db.data.apiKeys[apiKeyIndex];
    const now = new Date();
    
    // Initialize quota if not exists
    if (!apiKey.quota) {
      apiKey.quota = {
        dailyLimit: null,
        dailyUsed: 0,
        resetAt: getNextResetTime()
      };
    }

    // Check if quota needs reset
    const resetAt = apiKey.quota.resetAt ? new Date(apiKey.quota.resetAt) : null;
    if (!resetAt || now >= resetAt) {
      apiKey.quota.dailyUsed = 0;
      apiKey.quota.monthlyUsed = 0;
      apiKey.quota.resetAt = getNextResetTime();
      apiKey.quota.monthlyResetAt = getMonthlyResetTime();
    }

    // Increment counters
    apiKey.quota.dailyUsed = (apiKey.quota.dailyUsed || 0) + 1;
    apiKey.quota.monthlyUsed = (apiKey.quota.monthlyUsed || 0) + 1;
    apiKey.quota.lastUsedAt = now.toISOString();

    db.data.apiKeys[apiKeyIndex] = apiKey;
    await db.write();

    return { 
      success: true, 
      dailyUsed: apiKey.quota.dailyUsed,
      dailyLimit: apiKey.quota.dailyLimit,
      monthlyUsed: apiKey.quota.monthlyUsed,
      monthlyLimit: apiKey.quota.monthlyLimit
    };
  } catch (error) {
    console.error('[apiKeyQuota] Failed to increment usage:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Set quota for an API key
 * @param {string} apiKeyId - API key ID
 * @param {object} quotaConfig - { dailyLimit, monthlyLimit }
 * @returns {Promise<{ success: boolean, apiKey?: object, error?: string }>}
 */
export async function setApiKeyQuota(apiKeyId, quotaConfig) {
  try {
    const db = await getDb();
    const apiKeyIndex = db.data.apiKeys.findIndex(k => k.id === apiKeyId);
    
    if (apiKeyIndex === -1) {
      return { success: false, error: 'API key not found' };
    }

    const apiKey = db.data.apiKeys[apiKeyIndex];
    const now = new Date();

    // Initialize or update quota
    apiKey.quota = {
      dailyLimit: quotaConfig.dailyLimit || null,
      dailyUsed: 0,  // Reset on quota change
      resetAt: getNextResetTime(),
      monthlyLimit: quotaConfig.monthlyLimit || null,
      monthlyUsed: 0,
      monthlyResetAt: getMonthlyResetTime(),
      lastUsedAt: null
    };

    db.data.apiKeys[apiKeyIndex] = apiKey;
    await db.write();

    return { success: true, apiKey };
  } catch (error) {
    console.error('[apiKeyQuota] Failed to set quota:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get quota info for an API key
 * @param {string} apiKeyId - API key ID
 * @returns {Promise<{ quota?: object, error?: string }>}
 */
export async function getApiKeyQuota(apiKeyId) {
  try {
    const db = await getDb();
    const apiKey = db.data.apiKeys.find(k => k.id === apiKeyId);
    
    if (!apiKey) {
      return { error: 'API key not found' };
    }

    return { quota: apiKey.quota };
  } catch (error) {
    console.error('[apiKeyQuota] Failed to get quota:', error);
    return { error: error.message };
  }
}

/**
 * Get all API keys with quota info
 * @returns {Promise<Array>}
 */
export async function getAllApiKeysWithQuota() {
  const db = await getDb();
  return db.data.apiKeys.map(key => ({
    id: key.id,
    name: key.name,
    key: key.key,
    machineId: key.machineId,
    isActive: key.isActive,
    createdAt: key.createdAt,
    quota: key.quota || null
  }));
}

/**
 * Calculate next daily reset time (midnight UTC or local)
 * @returns {string} ISO timestamp
 */
function getNextResetTime() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString();
}

/**
 * Calculate next monthly reset time (1st of next month)
 * @returns {string} ISO timestamp
 */
function getMonthlyResetTime() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0);
  return nextMonth.toISOString();
}

/**
 * Format reset time for human reading
 * @param {string} isoString - ISO timestamp
 * @returns {string} Human-readable format
 */
export function formatResetTime(isoString) {
  if (!isoString) return 'N/A';
  
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 24) {
    return `in ${diffHours}h`;
  }
  
  return date.toLocaleString();
}
