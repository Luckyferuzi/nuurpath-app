const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Booking = sequelize.define('Booking', {
        status: { type: DataTypes.ENUM('Pending', 'Confirmed', 'Cancelled'), defaultValue: 'Pending' },
        travelDate: { type: DataTypes.DATEONLY, allowNull: false },
        passengers: { type: DataTypes.INTEGER, defaultValue: 1 },
        contactName: { type: DataTypes.STRING, allowNull: false },
        contactEmail: { type: DataTypes.STRING, allowNull: false },
        contactPhone: { type: DataTypes.STRING, allowNull: false },
        passportNumber: { type: DataTypes.STRING },
        nationality: { type: DataTypes.STRING },
        dateOfBirth: { type: DataTypes.DATEONLY },
        prefClass: { type: DataTypes.ENUM('Economy', 'Business', 'First'), defaultValue: 'Economy' },
        notes: { type: DataTypes.TEXT },
        totalPrice: { type: DataTypes.DECIMAL(10, 2) }
    });
    return Booking;
};