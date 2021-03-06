'use strict';

module.exports = {
    up: (queryInterface, Sequelize) =>
        queryInterface
            .createTable('AcousticFiles', {
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
                name: {
                    type: Sequelize.STRING,
                    allowNull: false
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
                queryInterface.createTable('DerivedFiles', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    observationId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Observations',
                            key: 'id'
                        }
                    },
                    url: {
                        type: Sequelize.STRING,
                        validate: {
                            isUrl: true
                        }
                    },
                    fileType: {
                        type: Sequelize.STRING,
                        allowNull: false
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
            )
            .then(() =>
                queryInterface.createTable('Logs', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    level: {
                        type: Sequelize.INTEGER
                    },
                    text: {
                        type: Sequelize.TEXT,
                        allowNull: false
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
            )
            .then(() =>
                queryInterface.createTable('Identifiers', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    match: {
                        type: Sequelize.TEXT,
                        allowNull: false
                    },
                    text: {
                        type: Sequelize.TEXT,
                        allowNull: false
                    },
                    type: {
                        type: Sequelize.STRING
                    },
                    data: {
                        type: Sequelize.JSON
                    },
                    projectId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Projects',
                            key: 'id'
                        }
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
            )
            .then(() =>
                queryInterface.createTable('Identifications', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    observationId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Observations',
                            key: 'id'
                        }
                    },
                    identifierId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Identifiers',
                            key: 'id'
                        }
                    },
                    invalid: {
                        type: Sequelize.BOOLEAN
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
            .dropTable('AcousticFiles')
            .then(() => queryInterface.dropTable('DerivedFiles'))
            .then(() => queryInterface.dropTable('Logs'))
            .then(() => queryInterface.dropTable('Identifications'))
            .then(() => queryInterface.dropTable('Identifiers'))
};
