'use strict';

module.exports = {
    up: (queryInterface, Sequelize) =>
        queryInterface
            .createTable('Assignments', {
                id: {
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                    type: Sequelize.INTEGER
                },
                userId: {
                    type: Sequelize.INTEGER,
                    references: {
                        type: Sequelize.INTEGER,
                        model: 'Users',
                        key: 'id'
                    }
                },
                surveyId: {
                    type: Sequelize.INTEGER,
                    references: {
                        type: Sequelize.INTEGER,
                        model: 'Surveys',
                        key: 'id'
                    }
                },
                role: {
                    type: Sequelize.STRING,
                    validate: {
                        isIn: [['pending', 'assigned', 'unassigned', 'lead']]
                    }
                },
                data: {
                    type: Sequelize.JSON
                },
                createdAt: {
                    allowNull: false,
                    type: Sequelize.DATE
                },
                updatedAt: {
                    allowNull: false,
                    type: Sequelize.DATE
                }
            })
            .then(() =>
                queryInterface.createTable('Statuses', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    surveyId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Surveys',
                            key: 'id'
                        }
                    },
                    state: {
                        type: Sequelize.STRING,
                        validate: {
                            isIn: [['open', 'closed', 'in-progress', 'pending']]
                        }
                    },
                    data: {
                        type: Sequelize.JSON
                    },
                    createdAt: {
                        allowNull: false,
                        type: Sequelize.DATE
                    },
                    updatedAt: {
                        allowNull: false,
                        type: Sequelize.DATE
                    }
                })
            ),

    down: (queryInterface, Sequelize) =>
        queryInterface
            .dropTable('Assignments')
            .then(() => queryInterface.dropTable('Statuses'))
};
