const {
    parseIdentifiers,
    deriveIdentifications,
    getAcousticFiles
} = require('./identifier.wrk');
const { Test } = require('falsifire');
const Future = require('fluture');

const projectIdentifiers = [];
const Survey = {
    Cycle: {
        get: () => 1
    }
};

describe('identification', () => {
    it('should handle a banding code', () => {
        const observation = {
            get: () => ({
                labelText: 'AMCR'
            }),
            Survey: Survey
        };

        const id = parseIdentifiers({ observation, projectIdentifiers });

        expect(id[0]).toEqual({ bandingCode: 'AMCR' });
    });

    it('should handle a banding code with abundance', () => {
        const observation = {
            get: () => ({
                labelText: 'AMCR 12'
            }),
            Survey: Survey
        };

        const id = parseIdentifiers({ observation, projectIdentifiers });

        expect(id[0]).toEqual({ bandingCode: 'AMCR', abundance: 12 });
    });

    it('should handle a banding code with abundance and notes', () => {
        const observation = {
            get: () => ({
                labelText: 'AMCR 12 pretty loud'
            }),
            Survey: Survey
        };

        const id = parseIdentifiers({ observation, projectIdentifiers });

        expect(id[0]).toEqual({ bandingCode: 'AMCR', abundance: 12 });
    });

    it('should handle a banding code with abundance and high quality', () => {
        const observation = {
            get: () => ({
                labelText: 'AMCR 12 pretty loud *'
            }),
            Survey: Survey
        };

        const id = parseIdentifiers({ observation, projectIdentifiers });

        expect(id[0]).toEqual({
            bandingCode: 'AMCR',
            abundance: 12,
            highQuality: true
        });
    });

    it('should handle a banding code with abundance and high quality and importance', () => {
        const observation = {
            get: () => ({
                labelText: 'AMCR 12 pretty loud! *'
            }),
            Survey: Survey
        };

        const id = parseIdentifiers({ observation, projectIdentifiers });

        expect(id[0]).toEqual({
            bandingCode: 'AMCR',
            abundance: 12,
            highQuality: true,
            important: true
        });
    });

    it('should handle a scientific banding code with abundance and high quality', () => {
        const observation = {
            get: () => ({
                labelText: 'CARCAR 2*'
            }),
            Survey: Survey
        };

        const id = parseIdentifiers({ observation, projectIdentifiers });

        expect(id[0]).toEqual({
            bandingCode: 'CARCAR',
            abundance: 2,
            highQuality: true
        });
    });

    it('should handle a unknown items', () => {
        const observation = {
            get: () => ({
                labelText: 'unkn *'
            }),
            Survey: Survey
        };

        const id = parseIdentifiers({ observation, projectIdentifiers });

        expect(id[0]).toEqual({ unknown: true, highQuality: true });
    });

    it('should handle multiple identifications', () => {
        const observation = {
            get: () => ({
                labelText: 'NOCA 2, BCCH, BRCR'
            }),
            Survey: Survey
        };

        const id = parseIdentifiers({ observation, projectIdentifiers });

        expect(id).toEqual([
            { bandingCode: 'NOCA', abundance: 2 },
            { bandingCode: 'BCCH' },
            { bandingCode: 'BRCR' }
        ]);
    });
});
