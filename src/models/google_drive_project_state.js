'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Google_Drive_Project_State', {
        token: {
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
