'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Survey', {
        start: {
            allowNull: false,
            type: DataTypes.DATE
        },
        end: {
            allowNull: false,
            type: DataTypes.DATE
        },
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
        zoneId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Zone',
                key: 'id'
            }
        },
        cycleId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Cycle',
                key: 'id'
            }
        },
        authorId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'User',
                key: 'id'
            }
        },
        invalid: {
            type: DataTypes.BOOLEAN
        }
    });
