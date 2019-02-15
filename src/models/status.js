'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Status', {
        status: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['open', 'closed', 'in-progress', 'pending']]
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
        data: {
            type: DataTypes.JSON
        }
    });
