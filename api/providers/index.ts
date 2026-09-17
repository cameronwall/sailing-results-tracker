// Provider Factory for Results Extraction (V2.1)

import type { ResultExtractionProvider } from './providerInterface';
import { GeminiVisionAdapter } from './geminiVisionAdapter';
import { MockVisionAdapter } from './mockVisionAdapter';

export * from './providerInterface';
export * from './mockVisionAdapter';
export * from './geminiVisionAdapter';

export const getExtractionProvider = (customProvider?: string): ResultExtractionProvider => {
    const providerName = (customProvider || process.env.EXTRACTION_PROVIDER || '').toLowerCase();

    if (providerName === 'gemini' || (!providerName && process.env.GEMINI_API_KEY)) {
        return new GeminiVisionAdapter();
    }

    // Default to Mock adapter for tests and local development when no external key is configured
    return new MockVisionAdapter();
};
