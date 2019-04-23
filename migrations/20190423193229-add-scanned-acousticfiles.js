module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.sequelize.transaction(t => {
            return Promise.all([
                queryInterface.addColumn(
                    'AcousticFiles',
                    'scanned',
                    {
                        type: Sequelize.BOOLEAN,
                        defaultValue: false
                    },
                    { transaction: t }
                )
            ]);
        });
    },

    down: (queryInterface, Sequelize) => {
        return queryInterface.sequelize.transaction(t => {
            return Promise.all([
                queryInterface.removeColumn('AcousticFiles', 'scanned', {
                    transaction: t
                })
            ]);
        });
    }
};
