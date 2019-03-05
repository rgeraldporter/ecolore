const {
    parseIdentifiers,
    deriveIdentifications,
    getAcousticFiles
} = require('./identifier.wrk');
const { Test } = require('falsifire');
const Future = require('fluture');

describe('meow', () => {
    it('shou', done => {
        getAcousticFiles((a) => {
            console.log('done!!!');
            done();
        });
    }, 150000);
});

describe('identification', () => {
    it('should handle a banding code', () => {
        const obs = {
            get: () => ({
                labelText: 'AMCR'
            })
        };

        const id = parseIdentifiers(obs);

        expect(id[0]).toEqual({ bandingCode: 'AMCR' });
    });

    it('should handle a banding code with abundance', () => {
        const obs = {
            get: () => ({
                labelText: 'AMCR 12'
            })
        };

        const id = parseIdentifiers(obs);

        expect(id[0]).toEqual({ bandingCode: 'AMCR', abundance: 12 });
    });

    it('should handle a banding code with abundance and notes', () => {
        const obs = {
            get: () => ({
                labelText: 'AMCR 12 pretty loud'
            })
        };

        const id = parseIdentifiers(obs);

        expect(id[0]).toEqual({ bandingCode: 'AMCR', abundance: 12 });
    });

    it('should handle a banding code with abundance and high quality', () => {
        const obs = {
            get: () => ({
                labelText: 'AMCR 12 pretty loud *'
            })
        };

        const id = parseIdentifiers(obs);

        expect(id[0]).toEqual({
            bandingCode: 'AMCR',
            abundance: 12,
            highQuality: true
        });
    });

    it('should handle a banding code with abundance and high quality and importance', () => {
        const obs = {
            get: () => ({
                labelText: 'AMCR 12 pretty loud! *'
            })
        };

        const id = parseIdentifiers(obs);

        expect(id[0]).toEqual({
            bandingCode: 'AMCR',
            abundance: 12,
            highQuality: true,
            important: true
        });
    });

    it('should handle a scientific banding code with abundance and high quality', () => {
        const obs = {
            get: () => ({
                labelText: 'CARCAR 2*'
            })
        };

        const id = parseIdentifiers(obs);

        expect(id[0]).toEqual({
            bandingCode: 'CARCAR',
            abundance: 2,
            highQuality: true
        });
    });

    it('should handle a unknown items', () => {
        const obs = {
            get: () => ({
                labelText: 'unkn *'
            })
        };

        const id = parseIdentifiers(obs);

        expect(id[0]).toEqual({ unknown: true, highQuality: true });
    });

    it('should handle multiple identifications', () => {
        const obs = {
            get: () => ({
                labelText: 'NOCA 2, BCCH, BRCR'
            })
        };

        const id = parseIdentifiers(obs);

        expect(id).toEqual([
            { bandingCode: 'NOCA', abundance: 2 },
            { bandingCode: 'BCCH' },
            { bandingCode: 'BRCR' }
        ]);
    });
});
