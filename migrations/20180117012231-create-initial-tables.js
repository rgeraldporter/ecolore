'use strict';
module.exports = {
    up: (queryInterface, Sequelize) =>
        queryInterface
            .createTable('users', {
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
                queryInterface.createTable('projects', {
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
                            model: 'users',
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
                queryInterface.createTable('cycles', {
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
                            model: 'users',
                            key: 'id'
                        }
                    },
                    projectId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'projects',
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
                queryInterface.createTable('memberships', {
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
                            model: 'users',
                            key: 'id'
                        }
                    },
                    projectId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'projects',
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
                queryInterface.createTable('profiles', {
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
                            model: 'users',
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
                queryInterface.createTable('reports', {
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
                            model: 'users',
                            key: 'id'
                        }
                    },
                    cycleId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'cycles',
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
                queryInterface.createTable('maps', {
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
                    creatorId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'users',
                            key: 'id'
                        }
                    },
                    projectId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'projects',
                            key: 'id'
                        }
                    },
                    cycleId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'cycles',
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
                queryInterface.createTable('zones', {
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
                    projectId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'projects',
                            key: 'id'
                        }
                    },
                    cycleId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'cycles',
                            key: 'id'
                        }
                    },
                    mapId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'maps',
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
                queryInterface.createTable('pages', {
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
                            model: 'users',
                            key: 'id'
                        }
                    },
                    projectId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'projects',
                            key: 'id'
                        }
                    },
                    cycleId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'cycles',
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
                queryInterface.createTable('surveys', {
                    id: {
                        allowNull: false,
                        autoIncrement: true,
                        primaryKey: true,
                        type: Sequelize.INTEGER
                    },
                    start: {
                        allowNull: false,
                        type: Sequelize.DATE
                    },
                    end: {
                        allowNull: false,
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
                            model: 'zones',
                            key: 'id'
                        }
                    },
                    cycleId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'cycles',
                            key: 'id'
                        }
                    },
                    authorId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'users',
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
                queryInterface.createTable('observations', {
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
                            model: 'surveys',
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
                queryInterface.createTable('google_drive_oauth2_tokens', {
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
                            model: 'projects',
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
                queryInterface.createTable('google_drive_project_states', {
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
                            model: 'projects',
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
                queryInterface.createTable('files', {
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
                            model: 'users',
                            key: 'id'
                        }
                    },
                    projectId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'projects',
                            key: 'id'
                        }
                    },
                    cycleId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'cycles',
                            key: 'id'
                        }
                    },
                    reportId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'reports',
                            key: 'id'
                        }
                    },
                    observationId: {
                        type: Sequelize.INTEGER,
                        references: {
                            type: Sequelize.INTEGER,
                            model: 'observations',
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
            .then(() => queryInterface.dropTable('projects'))
            .then(() => queryInterface.dropTable('cycles'))
            .then(() => queryInterface.dropTable('memberships'))
            .then(() => queryInterface.dropTable('profiles'))
            .then(() => queryInterface.dropTable('reports'))
            .then(() => queryInterface.dropTable('files'))
            .then(() => queryInterface.dropTable('maps'))
            .then(() => queryInterface.dropTable('zones'))
            .then(() => queryInterface.dropTable('pages'))
            .then(() => queryInterface.dropTable('surveys'))
            .then(() => queryInterface.dropTable('observations'))
};
