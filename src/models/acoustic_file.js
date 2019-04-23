'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('AcousticFile', {
        surveyId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Survey',
                key: 'id'
            }
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        data: {
            type: DataTypes.JSON
        },
        priority: {
            type: DataTypes.TINYINT
        },
        reviewed: {
            type: DataTypes.BOOLEAN
        },
        scanned: {
            type: DataTypes.BOOLEAN
        }
    });
