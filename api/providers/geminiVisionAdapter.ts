// Gemini Vision Provider Adapter (V2.1 Initial Multimodal Provider)

import type { ResultExtractionProvider, ExtractionInputFile } from './providerInterface';
import type { RawFleetExtractionResult } from '../../src/types/import';

const EXTRACTION_SYSTEM_PROMPT = `
You are an expert sports data extraction assistant for Manly Yacht Club (MYC) Laser sailing race results.
Your job is to extract official race results from uploaded sheet images (which may be Scratch sheets, Handicap/Pointscore sheets, or combined sheets).

CRITICAL INSTRUCTIONS:
1. Extract every boat row visible in the official fleet results table.
2. For each row extract:
   - rawSailNumber (string, e.g. "214582")
   - rawBoatName (string, e.g. "Zippy")
   - rawSkipperName (string, e.g. "Cameron Wall")
   - scratchPlace (integer or null if absent/DNF/DNS/DNC/DSQ)
   - handicapPlace (integer or null if absent/DNF/DNS/DNC/DSQ)
   - statusCode ("NONE", "DNC", "DNS", "DNF", "DSQ")
3. Placings must be the boat's finish place in the COMPLETE FLEET, exactly as printed. Never re-number or compress placings.
4. Detect metadata if printed on the page:
   - raceNumber (e.g. Race 6)
   - raceDate (ISO date YYYY-MM-DD if printed)
   - totalStartersFound (number of boats that started the race)
   - seriesEntrantsFound (total boats entered in the series)
5. NEVER invent missing values. If handicap is missing, return null.
6. Rate extraction confidence as "HIGH", "MEDIUM", or "LOW" based on legibility.
`;

export class GeminiVisionAdapter implements ResultExtractionProvider {
    readonly providerName = 'google-gemini-2.5-flash';
    private apiKey: string;

    constructor(apiKey?: string) {
        this.apiKey = apiKey || process.env.GEMINI_API_KEY || '';
    }

    async extractOfficialResults(
        files: ExtractionInputFile[]
    ): Promise<RawFleetExtractionResult> {
        if (!this.apiKey) {
            throw new Error('GEMINI_API_KEY is not configured on the server.');
        }

        if (!files || files.length === 0) {
            throw new Error('No image files provided for extraction.');
        }

        // Build inline data parts
        const imageParts = files.map(f => ({
            inlineData: {
                data: f.buffer.toString('base64'),
                mimeType: f.mimeType
            }
        }));

        const payload = {
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: EXTRACTION_SYSTEM_PROMPT },
                        ...imageParts,
                        { text: 'Extract all results from the attached official race sheet(s) into structured JSON.' }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.1
            }
        };

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${this.apiKey}`;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        const candidate = data.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;

        if (!text) {
            throw new Error('Gemini API returned an empty extraction result.');
        }

        try {
            const parsed = JSON.parse(text) as RawFleetExtractionResult;
            return {
                raceNumber: parsed.raceNumber,
                raceDate: parsed.raceDate,
                sourceSheetType: parsed.sourceSheetType || 'COMBINED',
                totalStartersFound: parsed.totalStartersFound,
                seriesEntrantsFound: parsed.seriesEntrantsFound,
                entries: Array.isArray(parsed.entries) ? parsed.entries : [],
                confidenceRating: parsed.confidenceRating || 'HIGH',
                parsingNotes: parsed.parsingNotes || []
            };
        } catch (err: any) {
            throw new Error(`Failed to parse structured JSON from vision model: ${err.message}`);
        }
    }
}
