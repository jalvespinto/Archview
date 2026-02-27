/**
 * Tests for Kiro AI API POC
 * Task: 4.0 - Validate Kiro AI API integration
 * 
 * These tests document the actual behavior of the Kiro AI API
 * and serve as validation for the POC findings
 */

import {
  testKiroAIAvailability,
  testKiroAISignature,
  testKiroAIWithMinimalGrounding,
  testKiroAIConstraints,
  testFallbackBehavior,
  runKiroAIPOC
} from './kiro-ai-poc';

describe('Kiro AI API POC Tests', () => {
  describe('API Availability', () => {
    it('should detect Kiro AI API availability', async () => {
      const result = await testKiroAIAvailability();
      
      // Document the result
      console.log('API Availability Result:', JSON.stringify(result, null, 2));
      
      // The test passes regardless of availability - we're documenting behavior
      expect(result).toHaveProperty('available');
      expect(result).toHaveProperty('apiType');
      
      if (!result.available) {
        console.warn('Kiro AI API not available:', result.error);
      }
    });
  });

  describe('API Signature', () => {
    it('should document available API methods', async () => {
      const availabilityResult = await testKiroAIAvailability();
      
      if (!availabilityResult.available) {
        console.log('Skipping signature test - API not available');
        return;
      }
      
      // Get Kiro AI instance
      let kiroAI: any;
      try {
        if (availabilityResult.apiType === 'import') {
          const kiro = await import('kiro').catch(() => null);
          kiroAI = kiro?.ai;
        } else if (availabilityResult.apiType === 'global') {
          kiroAI = (global as any).kiro.ai;
        } else if (availabilityResult.apiType === 'mock') {
          const { getKiroAI } = await import('./kiro-api-stub');
          const result = await getKiroAI();
          kiroAI = result.api;
        }
      } catch (error) {
        console.log('Could not get Kiro AI instance:', error);
        return;
      }
      
      const result = await testKiroAISignature(kiroAI);
      
      // Document the result
      console.log('API Signature Result:', JSON.stringify(result, null, 2));
      
      expect(result).toHaveProperty('methods');
      expect(result).toHaveProperty('supportsStreaming');
      expect(result).toHaveProperty('supportsJSON');
    });
  });

  describe('Minimal Grounding Test', () => {
    it('should test AI with minimal grounding data', async () => {
      const availabilityResult = await testKiroAIAvailability();
      
      if (!availabilityResult.available) {
        console.log('Skipping grounding test - API not available');
        return;
      }
      
      // Get Kiro AI instance
      let kiroAI: any;
      try {
        if (availabilityResult.apiType === 'import') {
          const kiro = await import('kiro').catch(() => null);
          kiroAI = kiro?.ai;
        } else if (availabilityResult.apiType === 'global') {
          kiroAI = (global as any).kiro.ai;
        } else if (availabilityResult.apiType === 'mock') {
          const { getKiroAI } = await import('./kiro-api-stub');
          const result = await getKiroAI();
          kiroAI = result.api;
        }
      } catch (error) {
        console.log('Could not get Kiro AI instance:', error);
        return;
      }
      
      const result = await testKiroAIWithMinimalGrounding(kiroAI);
      
      // Document the result
      console.log('Minimal Grounding Test Result:', JSON.stringify(result, null, 2));
      
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('responseTimeMs');
      expect(result).toHaveProperty('responseFormat');
      
      if (result.success) {
        console.log('Response time:', result.responseTimeMs, 'ms');
        console.log('Token estimate:', result.tokenEstimate);
        console.log('Response format:', result.responseFormat);
      } else {
        console.warn('Grounding test failed:', result.error);
      }
    }, 60000); // 60 second timeout for AI calls
  });

  describe('API Constraints', () => {
    it('should document API rate limits and constraints', async () => {
      const availabilityResult = await testKiroAIAvailability();
      
      if (!availabilityResult.available) {
        console.log('Skipping constraints test - API not available');
        return;
      }
      
      // Get Kiro AI instance
      let kiroAI: any;
      try {
        if (availabilityResult.apiType === 'import') {
          const kiro = await import('kiro').catch(() => null);
          kiroAI = kiro?.ai;
        } else if (availabilityResult.apiType === 'global') {
          kiroAI = (global as any).kiro.ai;
        } else if (availabilityResult.apiType === 'mock') {
          const { getKiroAI } = await import('./kiro-api-stub');
          const result = await getKiroAI();
          kiroAI = result.api;
        }
      } catch (error) {
        console.log('Could not get Kiro AI instance:', error);
        return;
      }
      
      const result = await testKiroAIConstraints(kiroAI);
      
      // Document the result
      console.log('API Constraints Result:', JSON.stringify(result, null, 2));
      
      expect(result).toHaveProperty('rateLimitHit');
      expect(result).toHaveProperty('supportsConcurrent');
      
      if (result.maxTokensEstimate) {
        console.log('Max tokens estimate:', result.maxTokensEstimate);
      }
    }, 120000); // 2 minute timeout for constraint testing
  });

  describe('Fallback Behavior', () => {
    it('should test fallback when AI is unavailable', async () => {
      const result = await testFallbackBehavior(null);
      
      // Document the result
      console.log('Fallback Behavior Result:', JSON.stringify(result, null, 2));
      
      expect(result).toHaveProperty('fallbackNeeded');
      expect(result).toHaveProperty('fallbackStrategy');
      expect(result.fallbackNeeded).toBe(true);
      expect(result.fallbackStrategy).toBe('heuristic');
    });
  });

  describe('Full POC Run', () => {
    it('should run complete POC and generate report', async () => {
      const report = await runKiroAIPOC();
      
      // Document the full report
      console.log('\n=== KIRO AI API POC REPORT ===');
      console.log('Timestamp:', report.timestamp);
      console.log('Summary:', report.summary);
      console.log('\nTest Results:');
      report.tests.forEach(test => {
        console.log(`\n${test.name}: ${test.passed ? 'PASSED' : 'FAILED'}`);
        console.log('Details:', JSON.stringify(test.details, null, 2));
      });
      console.log('\n=== END REPORT ===\n');
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('tests');
      expect(report).toHaveProperty('summary');
      expect(Array.isArray(report.tests)).toBe(true);
    }, 180000); // 3 minute timeout for full POC
  });
});
