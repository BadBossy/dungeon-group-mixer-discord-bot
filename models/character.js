const { DataTypes } = require('sequelize');
const sequelize = require('./index');

const Character = sequelize.define('Character', {
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    class: {
        type: DataTypes.STRING,
        allowNull: false
    },
    spec: {
        type: DataTypes.STRING,
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false
    },
    PlayerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Players', 
            key: 'id'
        }
    }
});

Character.associate = (models) => {
    Character.belongsTo(models.Player, { foreignKey: 'PlayerId' });
};

module.exports = Character;
