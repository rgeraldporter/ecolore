'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const db = {};
const Op = Sequelize.Op;

const dbConfig = {
    database: process.env.DB_NAME,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    options: {
        host: process.env.DB_HOST,
        operatorsAliases: Op,
        dialect: 'mariadb'
    }
};

const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    dbConfig.options
);

fs.readdirSync(__dirname)
    .filter(file => {
        return (
            file.indexOf('.') !== 0 &&
            file !== basename &&
            file.slice(-3) === '.js'
        );
    })
    .forEach(file => {
        const model = sequelize['import'](path.join(__dirname, file));
        db[model.name] = model;
    });

const {
    Cycle,
    Map,
    Membership,
    Profile,
    Project,
    Report,
    User,
    Zone,
    File,
    Page,
    Survey,
    Observation,
    Review,
    Invite,
    Google_Drive_OAuth2_Token,
    Google_Drive_Project_State,
    Assignment,
    Status,
    Log,
    DerivedFile,
    AcousticFile,
    Identifier,
    Identification
} = db;

// relations
Cycle.Project = Cycle.belongsTo(Project);
Cycle.User = Cycle.belongsTo(User, { as: 'creator' });
Project.belongsTo(User, { as: 'creator' });
Membership.User = Membership.belongsTo(User);
Membership.Project = Membership.belongsTo(Project);
Invite.Project = Invite.belongsTo(Project);
User.hasMany(Membership);
Project.hasMany(Membership);
Project.hasMany(Cycle);
Project.hasMany(Map);
Profile.belongsTo(User);
Report.belongsTo(User, { as: 'author' });
Report.belongsTo(Cycle);
File.belongsTo(User, { as: 'uploader' });
File.belongsTo(Project);
File.belongsTo(Cycle);
File.belongsTo(Report);
File.belongsTo(Observation);
Map.belongsTo(User, { as: 'creator' });
Map.belongsTo(Project);
Map.belongsTo(Cycle);
Zone.belongsTo(Project);
Zone.belongsTo(Map);
Page.belongsTo(User, { as: 'author' });
Page.belongsTo(Project);
Page.belongsTo(Cycle);
Survey.belongsTo(Cycle);
Survey.belongsTo(User, { as: 'author' });
Survey.belongsTo(Zone);
Cycle.hasMany(Survey);
Observation.belongsTo(Survey);
Observation.hasMany(File);
Observation.hasMany(Identification);
Survey.hasMany(Observation);
Google_Drive_OAuth2_Token.belongsTo(Project);
Google_Drive_Project_State.belongsTo(Project);
Review.belongsTo(User, { as: 'reviewer' });
Review.belongsTo(Survey);
Review.belongsTo(Observation);
Observation.hasMany(Review);
Observation.hasMany(DerivedFile);
Survey.hasMany(Review);
Survey.hasMany(Assignment);
Survey.hasMany(Status);
Survey.hasMany(AcousticFile);
Status.belongsTo(Survey);
Assignment.belongsTo(Survey);
Assignment.belongsTo(User);
DerivedFile.belongsTo(Observation);
AcousticFile.belongsTo(Survey);
Identification.belongsTo(Identifier);
Identification.belongsTo(Observation);

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
