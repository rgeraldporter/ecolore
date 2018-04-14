'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Observation', {
        data: {
            type: DataTypes.JSON
        },
        review: {
            type: DataTypes.STRING,
            defaultValue: 'none',
            validate: {
                isIn: [['none', 'failed', 'passed']]
            }
        },
        surveyId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Survey',
                key: 'id'
            }
        },
        invalid: {
            type: DataTypes.BOOLEAN
        }
    });
