'use strict';

const codes = require('./assets/birdpop-alpha-2018.json');

module.exports = {
    up: (queryInterface, Sequelize) => {
        let promise = Promise.resolve();

        codes.forEach(code => {
            promise = promise.then(() =>
                queryInterface.bulkInsert(
                    'Identifiers',
                    [
                        {
                            match: code.SPEC,
                            text: code.COMMONNAME,
                            type: 'birdpop-alpha-2018',
                            data: JSON.stringify({
                                sciName: code.SCINAME,
                                commonName: code.COMMONNAME,
                                spec6: code.SPEC6,
                                spec: code.SPEC
                            }),
                            createdAt: '2019-02-28 18:00:00',
                            updatedAt: '2019-02-28 18:00:00'
                        }
                    ],
                    {}
                )
            );
        });

        codes.forEach(code => {
            promise = promise.then(() =>
                queryInterface.bulkInsert(
                    'Identifiers',
                    [
                        {
                            match: code.SPEC6,
                            text: code.COMMONNAME,
                            type: 'birdpop-alpha-2018',
                            data: JSON.stringify({
                                sciName: code.SCINAME,
                                commonName: code.COMMONNAME,
                                spec6: code.SPEC6,
                                spec: code.SPEC
                            }),
                            createdAt: '2019-02-28 18:00:00',
                            updatedAt: '2019-02-28 18:00:00'
                        }
                    ],
                    {}
                )
            );
        });

        return promise;
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.bulkDelete('Identifiers', {
            type: 'birdpop-alpha-2018'
        });
    }
};
