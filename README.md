
# Dungeon Group Mixer Discord Bot

An helper for WoW Friends to decide which character to play for dungeons. Add your characters and generate to get a group randomized based on your friends in your current voice channel.


## Installation

Install my-project with npm

```bash
  npm i
```
    
## Deployment

To deploy this project run

```bash
touch .env
```

add the following to the .env file
- DISCORD_TOKEN=YOURTOKENHERE

Run the bot with:
```bash
  node index.js
```


## Bot Commands

| Parameter | Description                |
| :-------- | :------------------------- |
| `!list` | list all characters from you |
| `!addcharacter <name> <class> <spec>` | adds a new character |
| `!removecharacter <name>` | removes a character |
| `!generate` | generate a group |
