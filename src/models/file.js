'use strict';
module.exports = (sequelize, DataTypes) =>
    sequelize.define('File', {
        url: {
            type: DataTypes.STRING,
            validate: {
                isUrl: true
            }
        },
        label: DataTypes.STRING,
        public: DataTypes.BOOLEAN,
        deleted: DataTypes.BOOLEAN,
        observationId: {
            type: DataTypes.INTEGER,
            references: {
                type: DataTypes.INTEGER,
                model: 'Observation',
                key: 'id'
            }
        }
    });
