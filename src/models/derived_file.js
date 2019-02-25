'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('DerivedFile', {
        observationId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Observation',
                key: 'id'
            }
        },
        url: {
            type: DataTypes.STRING,
            validate: {
                isUrl: true
            }
        },
        fileType: {
            type: DataTypes.STRING,
            allowNull: false
        },
        data: {
            type: DataTypes.JSON
        }
    });
