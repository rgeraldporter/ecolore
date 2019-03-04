'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Identification', {
        observationId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Observation',
                key: 'id'
            }
        },
        identifierId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Identifier',
                key: 'id'
            }
        },
        invalid: {
            type: DataTypes.BOOLEAN
        },
        data: {
            type: DataTypes.JSON
        }
    });
