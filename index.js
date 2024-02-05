import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

var BOT_TOKEN = process.env.BOT_TOKEN;
var CHANNEL_ID = process.env.CHANNEL_ID;
var NEWSKY_API_TOKEN = process.env.NEWSKY_API_TOKEN;

const client = new Client({
  intents: [ GatewayIntentBits.Guilds ]
});

const fetchFlights = async (callback) => {
  const response = await fetch("https://newsky.app/api/airline-api/flights/ongoing", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${NEWSKY_API_TOKEN}`
    }
  });

  if (response.ok) {
    const data = await response.json();
    callback(data.results);
  }
}

client.on("ready", async () => {
  const channel = client.channels.cache.get(CHANNEL_ID);

  if (channel) {
    channel.messages.fetch().then((messages) => {
      messages.forEach((message) => {
        message.delete();
      });
    });
  }

  const getInFlightTime = (depTime) => {
    const depTimeAct = new Date(depTime);
    const currentTime = new Date();
    const diffInMinutes = Math.round((currentTime - depTimeAct) / (1000 * 60));
    return diffInMinutes;
  }

  fetchFlights((currentFlights) => {
    let embeds = [];

    embeds[0] = new EmbedBuilder()
      .setTitle("✈️ Ongoing PAFFSair flights")
      .setColor("#00AA00")
    
    embeds[1] = new EmbedBuilder()
      .setColor("#FFFFFF")

    currentFlights.forEach((flight) => {
      embeds[1].addFields(
        { name: `${flight.airline.icao}${flight.flightNumber} - ${flight.pilot.fullname.split(' ')[0]}`, value: `**Dep**: ${flight.dep.icao} | **Arr**: ${flight.arr.icao} | **In flight**: ${getInFlightTime(flight.depTimeAct)}min | **Aircraft**: ${flight.aircraft.airframe.icao} | **Network**: ${flight.network.name === 'vatsim' ? 'VATSIM' : '-'}` },
        { name: '\n', value: '\n' },
      );
    });
    

    channel.send({ embeds: embeds });
  });
});

client.login(BOT_TOKEN);