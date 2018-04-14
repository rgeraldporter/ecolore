'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Cycle', {
        title: DataTypes.STRING,
        start: DataTypes.DATE,
        end: DataTypes.DATE,
        description: DataTypes.TEXT,
        taxa: DataTypes.JSON,
        projectId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Project',
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
