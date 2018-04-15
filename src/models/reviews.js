'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Review', {
        comments: DataTypes.TEXT,
        pass: DataTypes.BOOLEAN,
        reviewerId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'User',
                key: 'id'
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
        observationId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Observation',
                key: 'id'
            }
        }
    });
