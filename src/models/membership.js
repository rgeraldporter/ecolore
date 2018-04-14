'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Membership', {
        role: {
            type: DataTypes.STRING,
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
        projectId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Project',
                key: 'id'
            }
        },
        userId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'User',
                key: 'id'
            }
        }
    });
