'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Assignment', {
        role: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['pending', 'assigned', 'unassigned', 'lead']]
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
        userId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'User',
                key: 'id'
            }
        },
        data: {
            type: DataTypes.JSON
        }
    });
