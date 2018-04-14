'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('User', {
        firstName: DataTypes.STRING,
        lastName: DataTypes.STRING,
        email: {
            type: DataTypes.STRING,
            validate: {
                isEmail: true
            }
        },
        bio: {
            type: DataTypes.TEXT
        },
        status: {
            type: DataTypes.STRING,
            defaultValue: 'active',
            validate: {
                isIn: [['active', 'archived']]
            }
        }
    });
