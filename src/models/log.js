'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Log', {
        level: {
            type: DataTypes.INTEGER
        },
        text: {
            type: DataTypes.TEXT,
            allowNull: false
        },
        data: {
            type: DataTypes.JSON
        }
    });
