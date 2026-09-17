// Mock Vision Provider Adapter for Deterministic Testing & Local Development (V2.1)

import type { ResultExtractionProvider, ExtractionInputFile } from './providerInterface';
import type { RawFleetExtractionResult } from '../../src/types/import';

export class MockVisionAdapter implements ResultExtractionProvider {
    readonly providerName = 'mock-vision-provider';

    private mockResponse: RawFleetExtractionResult;

    constructor(customMock?: Partial<RawFleetExtractionResult>) {
        this.mockResponse = {
            raceNumber: 6,
            raceDate: '2027-02-14',
            sourceSheetType: 'COMBINED',
            totalStartersFound: 14,
            seriesEntrantsFound: 21,
            confidenceRating: 'HIGH',
            entries: [
                { rawSailNumber: '214582', rawBoatName: 'Zippy', rawSkipperName: 'Cameron Wall', scratchPlace: 1, handicapPlace: 3 },
                { rawSailNumber: '198231', rawBoatName: 'Wave Dancer', rawSkipperName: 'John Hopkins', scratchPlace: 2, handicapPlace: 4 },
                { rawSailNumber: '205411', rawBoatName: 'Blue Streak', rawSkipperName: 'Ian Saunders', scratchPlace: 3, handicapPlace: 1 },
                { rawSailNumber: '211904', rawBoatName: 'Flying Fish', rawSkipperName: 'Peter Conde', scratchPlace: 4, handicapPlace: 2 },
                { rawSailNumber: '203118', rawBoatName: 'Slipstream', rawSkipperName: 'Phil Brock', scratchPlace: 5, handicapPlace: 5 },
                { rawSailNumber: '194720', rawBoatName: 'White Squall', rawSkipperName: 'Garth Davies', scratchPlace: 6, handicapPlace: 6 },
                { rawSailNumber: '217643', rawBoatName: 'North Star', rawSkipperName: 'Mark Thornburrow', scratchPlace: 7, handicapPlace: 7 },
                { rawSailNumber: '189422', rawBoatName: 'Laser Beam', rawSkipperName: 'David Adams', scratchPlace: 8, handicapPlace: 8 },
            ],
            parsingNotes: ['Successfully parsed official MYC Laser race sheet.'],
            ...customMock
        };
    }

    setMockResponse(response: RawFleetExtractionResult) {
        this.mockResponse = response;
    }

    async extractOfficialResults(
        files: ExtractionInputFile[]
    ): Promise<RawFleetExtractionResult> {
        if (!files || files.length === 0) {
            throw new Error('No files provided for extraction.');
        }
        return {
            ...this.mockResponse,
            parsingNotes: [
                ...(this.mockResponse.parsingNotes || []),
                `Processed ${files.length} file(s) via MockVisionAdapter.`
            ]
        };
    }
}
