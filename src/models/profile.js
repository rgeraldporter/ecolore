'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Profile', {
        type: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['ebird', 'twitter', 'instagram', 'website']]
            }
        },
        url: {
            type: DataTypes.STRING,
            validate: {
                isUrl: true
            }
        }
    });
