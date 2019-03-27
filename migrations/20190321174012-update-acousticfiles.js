module.exports = {
    up: (queryInterface, Sequelize) => {
        return queryInterface.sequelize.transaction(t => {
            return Promise.all([
                queryInterface.addColumn(
                    'AcousticFiles',
                    'priority',
                    {
                        type: Sequelize.TINYINT,
                        defaultValue: 0
                    },
                    { transaction: t }
                ),
                queryInterface.addColumn(
                    'AcousticFiles',
                    'reviewed',
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
                queryInterface.removeColumn('AcousticFiles', 'priority', {
                    transaction: t
                }),
                queryInterface.removeColumn('AcousticFiles', 'reviewed', {
                    transaction: t
                })
            ]);
        });
    }
};
