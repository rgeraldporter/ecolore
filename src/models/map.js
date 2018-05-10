'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Map', {
        url: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isUrl: true
            }
        },
        kml: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isUrl: true
            }
        },
        embedCode: DataTypes.TEXT,
        name: DataTypes.STRING,
        archived: DataTypes.BOOLEAN,
        projectId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Project',
                key: 'id'
            }
        },
        cycleId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Cycle',
                key: 'id'
            }
        },
        creatorId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'User',
                key: 'id'
            }
        }
    });
