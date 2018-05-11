'use strict';
module.exports = {
    up: (queryInterface, Sequelize) =>
        queryInterface
            .createTable('Users', {
                id: {
                    allowNull: false,
                    autoIncrement: true,
                    primaryKey: true,
                    type: Sequelize.INTEGER
                },
                email: {
                    type: Sequelize.STRING,
                    validate: {
                        isEmail: true
                    }
                },
                firstName: {
                    type: Sequelize.STRING
                },
                lastName: {
                    type: Sequelize.STRING
                },
                bio: {
                    type: Sequelize.TEXT
                },
                status: {
                    type: Sequelize.STRING,
                    defaultValue: 'active',
                    validate: {
                        isIn: [['active', 'archived']]
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
            .then(() =>
                queryInterface.createTable('Projects', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    title: {
                        type: Sequelize.STRING
                    },
                    slug: {
                        type: Sequelize.STRING
                    },
                    model: {
                        type: Sequelize.STRING
                    },
                    location: {
                        type: Sequelize.STRING
                    },
                    description: {
                        type: Sequelize.TEXT
                    },
                    url: {
                        type: Sequelize.STRING,
                        validate: {
                            isUrl: true
                        }
                    },
                    initialYear: {
                        type: Sequelize.SMALLINT
                    },
                    creatorId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Users',
                            key: 'id'
                        }
                    },
                    status: {
                        type: Sequelize.STRING
                    },
                    public: {
                        type: Sequelize.BOOLEAN
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
                queryInterface.createTable('Cycles', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    title: {
                        type: Sequelize.STRING
                    },
                    start: {
                        type: Sequelize.DATE
                    },
                    end: {
                        type: Sequelize.DATE
                    },
                    description: {
                        type: Sequelize.TEXT
                    },
                    taxa: {
                        type: Sequelize.JSON
                    },
                    creatorId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Users',
                            key: 'id'
                        }
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
                queryInterface.createTable('Memberships', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    role: {
                        type: Sequelize.STRING,
                        validate: {
                            isIn: [
                                [
                                    'administrator',
                                    'owner',
                                    'contributor',
                                    'observer',
                                    'reporter',
                                    'pending',
                                    'suspended'
                                ]
                            ]
                        }
                    },
                    userId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Users',
                            key: 'id'
                        }
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
                queryInterface.createTable('Invites', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    role: {
                        type: Sequelize.STRING,
                        validate: {
                            isIn: [
                                [
                                    'administrator',
                                    'owner',
                                    'contributor',
                                    'observer',
                                    'reporter'
                                ]
                            ]
                        }
                    },
                    email: {
                        type: Sequelize.STRING,
                        validate: {
                            isEmail: true
                        }
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
                queryInterface.createTable('Profiles', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    type: {
                        type: Sequelize.STRING,
                        validate: {
                            isIn: [['ebird', 'twitter', 'instagram', 'website']]
                        }
                    },
                    url: {
                        type: Sequelize.STRING,
                        validate: {
                            isUrl: true
                        }
                    },
                    userId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Users',
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
                queryInterface.createTable('Reports', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    content: {
                        type: Sequelize.TEXT('medium')
                    },
                    type: {
                        type: Sequelize.STRING
                    },
                    status: {
                        type: Sequelize.STRING,
                        validate: {
                            isIn: [['published', 'draft']]
                        }
                    },
                    authorId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Users',
                            key: 'id'
                        }
                    },
                    cycleId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Cycles',
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
                queryInterface.createTable('Maps', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    name: {
                        type: Sequelize.STRING
                    },
                    url: {
                        type: Sequelize.STRING,
                        validate: {
                            isUrl: true
                        }
                    },
                    kml: {
                        type: Sequelize.STRING,
                        validate: {
                            isUrl: true
                        }
                    },
                    embedCode: {
                        type: Sequelize.TEXT
                    },
                    archived: {
                        type: Sequelize.BOOLEAN
                    },
                    creatorId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Users',
                            key: 'id'
                        }
                    },
                    projectId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Projects',
                            key: 'id'
                        }
                    },
                    cycleId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Cycles',
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
                queryInterface.createTable('Zones', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    code: {
                        type: Sequelize.STRING
                    },
                    name: {
                        type: Sequelize.STRING
                    },
                    description: {
                        type: Sequelize.TEXT
                    },
                    archived: {
                        type: Sequelize.BOOLEAN
                    },
                    projectId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Projects',
                            key: 'id'
                        }
                    },
                    cycleId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Cycles',
                            key: 'id'
                        }
                    },
                    mapId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Maps',
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
                queryInterface.createTable('Pages', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    title: {
                        type: Sequelize.STRING
                    },
                    content: {
                        type: Sequelize.TEXT('medium')
                    },
                    slug: {
                        type: Sequelize.STRING
                    },
                    status: {
                        type: Sequelize.STRING,
                        defaultValue: 'draft',
                        validate: {
                            isIn: [['published', 'draft']]
                        }
                    },
                    authorId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Users',
                            key: 'id'
                        }
                    },
                    projectId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Projects',
                            key: 'id'
                        }
                    },
                    cycleId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Cycles',
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
                queryInterface.createTable('Surveys', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    start: {
                        type: Sequelize.DATE
                    },
                    end: {
                        type: Sequelize.DATE
                    },
                    data: {
                        type: Sequelize.JSON
                    },
                    review: {
                        type: Sequelize.STRING,
                        defaultValue: 'none',
                        validate: {
                            isIn: [['none', 'failed', 'passed']]
                        }
                    },
                    zoneId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Zones',
                            key: 'id'
                        }
                    },
                    cycleId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Cycles',
                            key: 'id'
                        }
                    },
                    authorId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Users',
                            key: 'id'
                        }
                    },
                    invalid: {
                        type: Sequelize.BOOLEAN
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
                queryInterface.createTable('Observations', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    data: {
                        type: Sequelize.JSON
                    },
                    review: {
                        type: Sequelize.STRING,
                        defaultValue: 'none',
                        validate: {
                            isIn: [['none', 'failed', 'passed']]
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
                    invalid: {
                        type: Sequelize.BOOLEAN
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
                queryInterface.createTable('Reviews', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    comments: {
                        type: Sequelize.TEXT
                    },
                    pass: {
                        type: Sequelize.BOOLEAN
                    },
                    reviewerId: {
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
                    observationId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Observations',
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
                queryInterface.createTable('Google_Drive_Oauth2_Tokens', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    accessToken: {
                        type: Sequelize.STRING
                    },
                    refreshToken: {
                        type: Sequelize.STRING
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
                queryInterface.createTable('Google_Drive_Project_States', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    token: {
                        type: Sequelize.STRING
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
                queryInterface.createTable('Files', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    url: {
                        type: Sequelize.STRING
                    },
                    label: {
                        type: Sequelize.STRING
                    },
                    public: {
                        type: Sequelize.BOOLEAN
                    },
                    deleted: {
                        type: Sequelize.BOOLEAN
                    },
                    uploaderId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Users',
                            key: 'id'
                        }
                    },
                    projectId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Projects',
                            key: 'id'
                        }
                    },
                    cycleId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Cycles',
                            key: 'id'
                        }
                    },
                    reportId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Reports',
                            key: 'id'
                        }
                    },
                    observationId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'Observations',
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
            ),
    down: (queryInterface, Sequelize) =>
        queryInterface
            .dropTable('users')
            .then(() => queryInterface.dropTable('Projects'))
            .then(() => queryInterface.dropTable('Cycles'))
            .then(() => queryInterface.dropTable('Memberships'))
            .then(() => queryInterface.dropTable('Invites'))
            .then(() => queryInterface.dropTable('Profiles'))
            .then(() => queryInterface.dropTable('Reports'))
            .then(() => queryInterface.dropTable('Files'))
            .then(() => queryInterface.dropTable('Maps'))
            .then(() => queryInterface.dropTable('Zones'))
            .then(() => queryInterface.dropTable('Pages'))
            .then(() => queryInterface.dropTable('Surveys'))
            .then(() => queryInterface.dropTable('Observations'))
            .then(() => queryInterface.dropTable('Reviews'))
};
