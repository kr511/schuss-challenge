/**
 * Vercel Speed Insights Integration
 * 
 * This module initializes Vercel Speed Insights for tracking Core Web Vitals.
 * The script automatically reports performance metrics to Vercel's analytics platform.
 */

import { injectSpeedInsights } from '@vercel/speed-insights';

// Initialize Speed Insights
injectSpeedInsights();

console.log('[Speed Insights] Vercel Speed Insights initialized');
