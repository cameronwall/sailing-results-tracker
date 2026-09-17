import {
    type KegCupBoat,
    type RaceMeta,
    type RawQualificationInput,
    type Season
} from '../types';

export const SAMPLE_SEASONS: Season[] = [
    {
        id: 'season-2026-27',
        slug: 'keg-cup-2026-27',
        name: '2026/27 Keg Cup',
        qualificationCutoffDate: '2026-12-20',
        kegCupStartDate: '2027-01-17',
        participationThreshold: 0.40,
        seriesFleetSize: 21,
        discardRules: [
            { completedRaces: 5, discards: 1 },
            { completedRaces: 10, discards: 2 },
            { completedRaces: 15, discards: 3 }
        ],
        qualifiersLocked: true,
        qualifiersLockedAt: '2026-12-21T10:00:00Z',
        qualifiersLockedBy: 'Race Committee',
        isActive: true
    },
    {
        id: 'season-2025-26',
        slug: 'keg-cup-2025-26',
        name: '2025/26 Keg Cup',
        qualificationCutoffDate: '2025-12-21',
        kegCupStartDate: '2026-01-18',
        participationThreshold: 0.40,
        seriesFleetSize: 20,
        discardRules: [
            { completedRaces: 5, discards: 1 },
            { completedRaces: 10, discards: 2 },
            { completedRaces: 15, discards: 3 }
        ],
        qualifiersLocked: true,
        qualifiersLockedAt: '2025-12-22T09:00:00Z',
        qualifiersLockedBy: 'Race Committee',
        isActive: false
    }
];

export const SAMPLE_RACES: RaceMeta[] = [
    { raceNumber: 1, raceDate: '2027-01-17', seriesEntrants: 21, boatsAtStart: 13, isCompleted: true },
    { raceNumber: 2, raceDate: '2027-01-24', seriesEntrants: 21, boatsAtStart: 14, isCompleted: true },
    { raceNumber: 3, raceDate: '2027-01-31', seriesEntrants: 21, boatsAtStart: 12, isCompleted: true },
    { raceNumber: 4, raceDate: '2027-02-07', seriesEntrants: 21, boatsAtStart: 15, isCompleted: true },
    { raceNumber: 5, raceDate: '2027-02-14', seriesEntrants: 21, boatsAtStart: 12, isCompleted: true },
    { raceNumber: 6, raceDate: '2027-02-21', seriesEntrants: 21, boatsAtStart: 14, isCompleted: true },
    { raceNumber: 7, raceDate: '2027-02-28', seriesEntrants: 21, boatsAtStart: 13, isCompleted: true },
    { raceNumber: 8, raceDate: '2027-03-07', seriesEntrants: 21, boatsAtStart: 12, isCompleted: true },
    { raceNumber: 9, raceDate: '2027-03-14', seriesEntrants: 21, boatsAtStart: 14, isCompleted: false },
    { raceNumber: 10, raceDate: '2027-03-21', seriesEntrants: 21, boatsAtStart: 14, isCompleted: false },
    { raceNumber: 11, raceDate: '2027-03-28', seriesEntrants: 21, boatsAtStart: 14, isCompleted: false },
    { raceNumber: 12, raceDate: '2027-04-04', seriesEntrants: 21, boatsAtStart: 14, isCompleted: false },
    { raceNumber: 13, raceDate: '2027-04-11', seriesEntrants: 21, boatsAtStart: 14, isCompleted: false },
    { raceNumber: 14, raceDate: '2027-04-18', seriesEntrants: 21, boatsAtStart: 14, isCompleted: false },
    { raceNumber: 15, raceDate: '2027-04-25', seriesEntrants: 21, boatsAtStart: 14, isCompleted: false },
    { raceNumber: 16, raceDate: '2027-05-02', seriesEntrants: 21, boatsAtStart: 14, isCompleted: false },
    { raceNumber: 17, raceDate: '2027-05-09', seriesEntrants: 21, boatsAtStart: 14, isCompleted: false },
    { raceNumber: 18, raceDate: '2027-05-16', seriesEntrants: 21, boatsAtStart: 14, isCompleted: false }
];

export const SAMPLE_KEG_CUP_BOATS: KegCupBoat[] = [
    {
        id: 'boat-1',
        skipper: 'Cameron Wall',
        boatName: 'Zippy',
        sailNumber: '214582',
        raceResults: {
            1: { scratchPlace: 3, handicapPlace: 5 }, // 4.0
            2: { scratchPlace: 2, handicapPlace: 3 }, // 2.5
            3: { scratchPlace: 4, handicapPlace: 2 }, // 3.0
            4: { scratchPlace: 5, handicapPlace: 4 }, // 4.5
            5: { scratchPlace: 2, handicapPlace: 2 }, // 2.0
            6: { scratchPlace: 3, handicapPlace: 4 }, // 3.5
            7: { scratchPlace: 8, handicapPlace: 9 }, // 8.5 (worst - dropped)
            8: { scratchPlace: 2, handicapPlace: 3 }  // 2.5
        }
    },
    {
        id: 'boat-2',
        skipper: 'John Hopkins',
        boatName: 'Wave Dancer',
        sailNumber: '198231',
        raceResults: {
            1: { scratchPlace: 2, handicapPlace: 4 }, // 3.0
            2: { scratchPlace: 3, handicapPlace: 2 }, // 2.5
            3: { scratchPlace: 3, handicapPlace: 3 }, // 3.0
            4: { scratchPlace: 2, handicapPlace: 3 }, // 2.5
            5: { scratchPlace: 6, handicapPlace: 5 }, // 5.5
            6: { scratchPlace: 4, handicapPlace: 3 }, // 3.5
            7: { scratchPlace: 2, handicapPlace: 2 }, // 2.0
            8: { scratchPlace: 10, handicapPlace: 10 } // 10.0 (worst - dropped)
        }
    },
    {
        id: 'boat-3',
        skipper: 'Ian Saunders',
        boatName: 'Blue Streak',
        sailNumber: '205411',
        raceResults: {
            1: { scratchPlace: 5, handicapPlace: 3 }, // 4.0
            2: { scratchPlace: 4, handicapPlace: 5 }, // 4.5
            3: { scratchPlace: 5, handicapPlace: 4 }, // 4.5
            4: { statusCode: 'DNF' },                 // 16.0 (15 starters + 1 - dropped)
            5: { scratchPlace: 3, handicapPlace: 3 }, // 3.0
            6: { scratchPlace: 2, handicapPlace: 2 }, // 2.0
            7: { scratchPlace: 4, handicapPlace: 3 }, // 3.5
            8: { scratchPlace: 3, handicapPlace: 4 }  // 3.5
        }
    },
    {
        id: 'boat-4',
        skipper: 'Peter Conde',
        boatName: 'Flying Fish',
        sailNumber: '211904',
        raceResults: {
            1: { scratchPlace: 4, handicapPlace: 2 }, // 3.0
            2: { scratchPlace: 5, handicapPlace: 4 }, // 4.5
            3: { scratchPlace: 2, handicapPlace: 5 }, // 3.5
            4: { scratchPlace: 4, handicapPlace: 3 }, // 3.5
            5: { scratchPlace: 4, handicapPlace: 4 }, // 4.0
            6: { scratchPlace: 6, handicapPlace: 5 }, // 5.5
            7: { scratchPlace: 5, handicapPlace: 4 }, // 4.5
            8: { scratchPlace: 7, handicapPlace: 8 }  // 7.5 (worst - dropped)
        }
    },
    {
        id: 'boat-5',
        skipper: 'Phil Brock',
        boatName: 'Slipstream',
        sailNumber: '203118',
        raceResults: {
            1: { scratchPlace: 6, handicapPlace: 6 }, // 6.0
            2: { scratchPlace: 6, handicapPlace: 6 }, // 6.0
            3: { scratchPlace: 6, handicapPlace: 6 }, // 6.0
            4: { scratchPlace: 3, handicapPlace: 2 }, // 2.5
            5: { scratchPlace: 5, handicapPlace: 6 }, // 5.5
            6: { scratchPlace: 5, handicapPlace: 6 }, // 5.5
            7: { statusCode: 'DNS' },                 // 14.0 (13 starters + 1 - dropped)
            8: { scratchPlace: 4, handicapPlace: 5 }  // 4.5
        }
    },
    {
        id: 'boat-6',
        skipper: 'Garth Davies',
        boatName: 'White Squall',
        sailNumber: '194720',
        raceResults: {
            1: { scratchPlace: 7, handicapPlace: 7 }, // 7.0
            2: { scratchPlace: 7, handicapPlace: 7 }, // 7.0
            3: { scratchPlace: 7, handicapPlace: 7 }, // 7.0
            4: { scratchPlace: 6, handicapPlace: 6 }, // 6.0
            5: { scratchPlace: 7, handicapPlace: 7 }, // 7.0
            6: { scratchPlace: 7, handicapPlace: 7 }, // 7.0
            7: { scratchPlace: 6, handicapPlace: 5 }, // 5.5
            8: { statusCode: 'DNC' }                  // 22.0 (21 entrants + 1 - dropped)
        }
    },
    {
        id: 'boat-7',
        skipper: 'Mark Thornburrow',
        boatName: 'North Star',
        sailNumber: '217643',
        raceResults: {
            1: { scratchPlace: 8, handicapPlace: 8 }, // 8.0
            2: { scratchPlace: 8, handicapPlace: 8 }, // 8.0
            3: { scratchPlace: 8, handicapPlace: 8 }, // 8.0
            4: { scratchPlace: 7, handicapPlace: 7 }, // 7.0
            5: { statusCode: 'DSQ' },                 // 13.0 (12 starters + 1 - dropped)
            6: { scratchPlace: 8, handicapPlace: 8 }, // 8.0
            7: { scratchPlace: 7, handicapPlace: 7 }, // 7.0
            8: { scratchPlace: 5, handicapPlace: 6 }  // 5.5
        }
    },
    {
        id: 'boat-8',
        skipper: 'David Adams',
        boatName: 'Laser Beam',
        sailNumber: '189422',
        raceResults: {
            1: { scratchPlace: 9, handicapPlace: 9 }, // 9.0
            2: { scratchPlace: 9, handicapPlace: 9 }, // 9.0
            3: { scratchPlace: 9, handicapPlace: 9 }, // 9.0
            4: { scratchPlace: 8, handicapPlace: 8 }, // 8.0
            5: { scratchPlace: 8, handicapPlace: 8 }, // 8.0
            6: { statusCode: 'DNF' },                 // 15.0 (14 starters + 1 - dropped)
            7: { scratchPlace: 8, handicapPlace: 8 }, // 8.0
            8: { scratchPlace: 6, handicapPlace: 7 }  // 6.5
        }
    }
];

export const SAMPLE_QUALIFICATION_INPUTS: RawQualificationInput[] = [
    { boatId: 'b-cw', skipper: 'Cameron Wall', boatName: 'Zippy', sailNumber: '214582', springRank: 9, clubChampRank: 10, racesSailed: 8, racesAvailable: 10 },
    { boatId: 'b-jh', skipper: 'John Hopkins', boatName: 'Wave Dancer', sailNumber: '198231', springRank: 8, clubChampRank: 11, racesSailed: 9, racesAvailable: 10 },
    { boatId: 'b-is', skipper: 'Ian Saunders', boatName: 'Blue Streak', sailNumber: '205411', springRank: 10, clubChampRank: 9, racesSailed: 7, racesAvailable: 10 },
    { boatId: 'b-pc', skipper: 'Peter Conde', boatName: 'Flying Fish', sailNumber: '211904', springRank: 11, clubChampRank: 12, racesSailed: 8, racesAvailable: 10 },
    { boatId: 'b-pb', skipper: 'Phil Brock', boatName: 'Slipstream', sailNumber: '203118', springRank: 12, clubChampRank: 13, racesSailed: 6, racesAvailable: 10 },
    { boatId: 'b-gd', skipper: 'Garth Davies', boatName: 'White Squall', sailNumber: '194720', springRank: 13, clubChampRank: 14, racesSailed: 7, racesAvailable: 10 },
    { boatId: 'b-mt', skipper: 'Mark Thornburrow', boatName: 'North Star', sailNumber: '217643', springRank: 14, clubChampRank: 15, racesSailed: 8, racesAvailable: 10 },
    { boatId: 'b-da', skipper: 'David Adams', boatName: 'Laser Beam', sailNumber: '189422', springRank: 15, clubChampRank: 16, racesSailed: 6, racesAvailable: 10 },
    // Upper fleet (Championship Fleet)
    { boatId: 'b-champ1', skipper: 'James Allan', boatName: 'Bullet', sailNumber: '219001', springRank: 1, clubChampRank: 1, racesSailed: 10, racesAvailable: 10 },
    { boatId: 'b-champ2', skipper: 'Rob Lowndes', boatName: 'Windrush', sailNumber: '218442', springRank: 2, clubChampRank: 3, racesSailed: 10, racesAvailable: 10 },
    { boatId: 'b-champ3', skipper: 'Michael Popple', boatName: 'Osprey', sailNumber: '212399', springRank: 3, clubChampRank: 2, racesSailed: 9, racesAvailable: 10 },
    { boatId: 'b-champ4', skipper: 'Simon Reffold', boatName: 'Viper', sailNumber: '209841', springRank: 4, clubChampRank: 4, racesSailed: 8, racesAvailable: 10 },
    { boatId: 'b-champ5', skipper: 'Andrew Cox', boatName: 'Zephyr', sailNumber: '207551', springRank: 5, clubChampRank: 6, racesSailed: 8, racesAvailable: 10 },
    { boatId: 'b-champ6', skipper: 'Tony Denham', boatName: 'Aquila', sailNumber: '206112', springRank: 6, clubChampRank: 5, racesSailed: 9, racesAvailable: 10 },
    { boatId: 'b-champ7', skipper: 'Chris Kelly', boatName: 'Apex', sailNumber: '204901', springRank: 7, clubChampRank: 7, racesSailed: 7, racesAvailable: 10 },
    // Inactive boats (Failed participation requirement)
    { boatId: 'b-inact1', skipper: 'Tom Howard', boatName: 'Drifter', sailNumber: '180221', springRank: 16, clubChampRank: 17, racesSailed: 2, racesAvailable: 10 },
    { boatId: 'b-inact2', skipper: 'Greg Wells', boatName: 'Lazy Day', sailNumber: '175402', springRank: 17, clubChampRank: 18, racesSailed: 1, racesAvailable: 10 }
];
