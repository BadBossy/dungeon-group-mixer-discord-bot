const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Player = sequelize.define('Player', {
    discordId: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    username: {
        type: DataTypes.STRING,
        allowNull: false
    }
});

Player.associate = (models) => {
    Player.hasMany(models.Character, { foreignKey: 'PlayerId' });
};

module.exports = Player;
