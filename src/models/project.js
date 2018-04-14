'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('Project', {
        title: DataTypes.STRING,
        slug: {
            type: DataTypes.STRING,
            validate: {
                is: /^[a-z0-9]+(?:-[a-z0-9]+)*$/ // slug validation pattern
            }
        },
        model: DataTypes.STRING,
        location: DataTypes.STRING,
        description: DataTypes.TEXT,
        url: {
            type: DataTypes.STRING,
            validate: {
                isUrl: true
            }
        },
        initialYear: DataTypes.SMALLINT, // really only 4 digit numbers
        status: {
            type: DataTypes.STRING,
            validate: {
                isIn: [['open', 'archived', 'closed']]
            }
        },
        public: DataTypes.BOOLEAN,
        creatorId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'User',
                key: 'id'
            }
        }
    });
