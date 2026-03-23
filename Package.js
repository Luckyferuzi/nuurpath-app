const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Package = sequelize.define('Package', {
        title: { type: DataTypes.STRING, allowNull: false },
        destination: { type: DataTypes.STRING, allowNull: false },
        duration: { type: DataTypes.STRING, allowNull: false },
        type: { type: DataTypes.ENUM('umrah', 'hajj', 'leisure'), allowNull: false },
        price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
        images: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
        isFeatured: { type: DataTypes.BOOLEAN, defaultValue: false },
        description: { type: DataTypes.TEXT, allowNull: false } // Stores HTML from ReactQuill
    });
    return Package;
};