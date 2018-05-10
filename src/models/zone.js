'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Zone', {
        code: DataTypes.STRING,
        name: DataTypes.STRING,
        description: DataTypes.TEXT,
        archived: DataTypes.BOOLEAN,
        projectId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Project',
                key: 'id'
            }
        },
        mapId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Map',
                key: 'id'
            }
        }
    });
