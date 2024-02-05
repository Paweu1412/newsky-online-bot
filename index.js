import { Client } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client();
client.on("ready", () => {
  console.log("I am ready!");
});

client.login(process.env.BOT_TOKEN);