require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const sequelize = require("./models");
const Player = require("./models/player");
const Character = require("./models/character");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});

const PREFIX = "!";
const RANDOM_PLAYER_LFG = {
  name: "RandomPlayerLFG",
  class: "unknown",
  spec: "unknown",
  role: "dps",
};

const classSpecRoleMap = {
  "death knight": { blood: "tank", frost: "dps", unholy: "dps" },
  "demon hunter": { havoc: "dps", vengeance: "tank" },
  druid: {
    balance: "dps",
    feral: "dps",
    guardian: "tank",
    restoration: "heal",
  },
  evoker: { augmentation: "dps", devastation: "dps", preservation: "heal" },
  hunter: { "beast mastery": "dps", marksmanship: "dps", survival: "dps" },
  mage: { arcane: "dps", fire: "dps", frost: "dps" },
  monk: { brewmaster: "tank", mistweaver: "heal", windwalker: "dps" },
  paladin: { holy: "heal", protection: "tank", retribution: "dps" },
  priest: { discipline: "heal", holy: "heal", shadow: "dps" },
  rogue: { assassination: "dps", outlaw: "dps", subtlety: "dps" },
  shaman: { elemental: "dps", enhancement: "dps", restoration: "heal" },
  warlock: { affliction: "dps", demonology: "dps", destruction: "dps" },
  warrior: { arms: "dps", fury: "dps", protection: "tank" },
};

// Set up associations
Player.associate({ Character });
Character.associate({ Player });

client.once("ready", () => {
  console.log("Dungeon Group Bot is online!");
  sequelize.sync({ alter: false }).then(() => {
    console.log("Database synced");
  });
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "addcharacter") {
    const characterName = args[0];
    const characterClass = args[1].toLowerCase();
    const spec = args[2].toLowerCase();

    if (!characterName || !characterClass || !spec) {
      return message.reply("Please provide character name, class, and spec.");
    }

    if (
      !classSpecRoleMap[characterClass] ||
      !classSpecRoleMap[characterClass][spec]
    ) {
      return message.reply(
        `Invalid class or specialization. Please check your input.`
      );
    }

    const role = classSpecRoleMap[characterClass][spec];

    let player = await Player.findOne({
      where: { discordId: message.author.id },
    });

    if (!player) {
      player = await Player.create({
        discordId: message.author.id,
        username: message.author.username,
      });
    }

    try {
      const character = await Character.create({
        name: characterName,
        class: characterClass,
        spec: spec,
        role: role,
        PlayerId: player.id,
      });
      return message.reply(
        `Character ${character.name} (${character.class} - ${character.spec} - ${character.role}) added to player ${player.username}.`
      );
    } catch (error) {
      console.error(error);
      return message.reply("Failed to add character.");
    }
  }

  if (command === "removecharacter") {
    const characterName = args.join(" ");

    if (!characterName) {
      return message.reply(
        "Please provide the name of the character to remove."
      );
    }

    let player = await Player.findOne({
      where: { discordId: message.author.id },
    });

    if (!player) {
      return message.reply("You do not have any characters to remove.");
    }

    const character = await Character.findOne({
      where: { name: characterName, PlayerId: player.id },
    });

    if (!character) {
      return message.reply(`Character ${characterName} not found.`);
    }

    try {
      await character.destroy();
      return message.reply(`Character ${characterName} has been removed.`);
    } catch (error) {
      console.error(error);
      return message.reply("Failed to remove character.");
    }
  }

  if (command === "generate") {
    if (!message.guild) return;

    const member = message.guild.members.cache.get(message.author.id);
    if (!member || !member.voice.channel) {
      return message.reply(
        "You must be in a voice channel to generate a group."
      );
    }

    const voiceChannel = member.voice.channel;
    const membersInChannel = voiceChannel.members
      .filter((m) => !m.user.bot)
      .map((m) => m.user.id);

    const group = await generateGroup(membersInChannel);

    return message.reply(
      `Generated Group:\n` +
        `Tank: ${group.tank.name} (${group.tank.class} - ${group.tank.spec})\n` +
        `Healer: ${group.heal.name} (${group.heal.class} - ${group.heal.spec})\n` +
        `DPS:\n${group.dps
          .map((d) => `${d.name} (${d.class} - ${d.spec})`)
          .join("\n")}`
    );
  }

  if (command === "list") {
    let player = await Player.findOne({
      where: { discordId: message.author.id },
    });

    if (!player) {
      return message.reply("You do not have any characters added.");
    }

    const characters = await Character.findAll({
      where: { PlayerId: player.id },
    });

    if (characters.length === 0) {
      return message.reply("You do not have any characters added.");
    }

    const characterList = characters
      .map((c) => `${c.name} (${c.class} - ${c.spec} - ${c.role})`)
      .join("\n");
    return message.reply(`Your Characters:\n${characterList}`);
  }
});

async function generateGroup(memberIds) {
  const assignedPlayers = new Set();
  const roleGroups = {
    tank: [],
    heal: [],
    dps: [],
  };

  // Get characters from the provided member IDs
  const characters = await Character.findAll({ include: Player });
  const availableCharacters = characters.filter((character) =>
    memberIds.includes(character.Player.discordId)
  );

  if (availableCharacters.length === 0) {
    return {
      tank: RANDOM_PLAYER_LFG,
      heal: RANDOM_PLAYER_LFG,
      dps: [RANDOM_PLAYER_LFG, RANDOM_PLAYER_LFG, RANDOM_PLAYER_LFG],
    };
  }

  availableCharacters.forEach((character) => {
    roleGroups[character.role].push(character);
  });

  function getUniqueRandomCharacter(role) {
    const available = roleGroups[role].filter(
      (c) => !assignedPlayers.has(c.Player.discordId)
    );
    if (available.length === 0) {
      return RANDOM_PLAYER_LFG;
    }
    const character = available[Math.floor(Math.random() * available.length)];
    assignedPlayers.add(character.Player.discordId);
    return character;
  }

  const roleOrder = ["tank", "heal", "dps", "dps", "dps"];
  roleOrder.sort(() => Math.random() - 0.5);

  const group = {
    tank: null,
    heal: null,
    dps: [],
  };

  roleOrder.forEach((role) => {
    const char = getUniqueRandomCharacter(role);
    if (role === "dps") {
      group.dps.push(char ?? RANDOM_PLAYER_LFG);
    } else if (role === "heal") {
      group.heal = char ?? RANDOM_PLAYER_LFG;
    } else if (role === "tank") {
      group.tank = char ?? RANDOM_PLAYER_LFG;
    }
  });

  return group;
}

client.login(process.env.DISCORD_TOKEN);
