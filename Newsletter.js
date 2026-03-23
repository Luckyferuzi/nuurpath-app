const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Newsletter = sequelize.define('Newsletter', {
        email: { type: DataTypes.STRING, allowNull: false, unique: true }
    });
    return Newsletter;
};