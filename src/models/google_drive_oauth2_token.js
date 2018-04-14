'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Google_Drive_OAuth2_Token', {
        accessToken: {
            type: DataTypes.STRING
        },
        refreshToken: {
            type: DataTypes.STRING
        },
        projectId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'projects',
                key: 'id'
            }
        },
    });
