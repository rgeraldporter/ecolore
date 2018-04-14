'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Page', {
        title: DataTypes.STRING,
        content: DataTypes.TEXT('medium'),
        slug: {
            type: DataTypes.STRING,
            validate: {
                is: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ // slug validation pattern
            }
        },
        status: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['published', 'draft']]
            }
        }
    });
