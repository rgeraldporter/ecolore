'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Report', {
        content: DataTypes.TEXT('medium'),
        type: DataTypes.STRING,
        status: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['published', 'draft']]
            }
        }
    });
