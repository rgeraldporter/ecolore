'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Invite', {
        role: {
            type: DataTypes.STRING,
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
        projectId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Project',
                key: 'id'
            }
        },
        email: {
            type: DataTypes.STRING,
            validate: {
                isEmail: true
            }
        }
    });
