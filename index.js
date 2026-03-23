const { Sequelize } = require('sequelize');

// Initialize Sequelize with the connection string from environment variables
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false, // Set to console.log to see SQL queries
});

const models = {};

// Import models
models.User = require('./User')(sequelize);
models.Package = require('./Package')(sequelize);
models.Booking = require('./Booking')(sequelize);
models.Newsletter = require('./Newsletter')(sequelize);

// Define Associations

// User <-> Booking
models.User.hasMany(models.Booking, { foreignKey: 'userId' });
models.Booking.belongsTo(models.User, { foreignKey: 'userId' });

// Package <-> Booking
models.Package.hasMany(models.Booking, { foreignKey: 'packageId' });
models.Booking.belongsTo(models.Package, { foreignKey: 'packageId' });

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;