'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Report', {
        content: DataTypes.TEXT('medium'),
        type: DataTypes.STRING,
        cycleId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Cycle',
                key: 'id'
            }
        },
        status: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['published', 'draft']]
            }
        }
    });
