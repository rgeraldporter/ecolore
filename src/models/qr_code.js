'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('QrCode', {
        link: {
            type: DataTypes.STRING
        }
    });
