'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Identifier', {
        match: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        text: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        type: {
            type: DataTypes.STRING
        },
        data: {
            type: DataTypes.JSON
        },
        projectId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Project',
                key: 'id'
            }
        }
    });
