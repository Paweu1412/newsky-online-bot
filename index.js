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

let messageToEdit = null;

client.on("ready", async () => {
  const channel = client.channels.cache.get(CHANNEL_ID);

  if (!channel) { console.error('Channel not found'); return; }

  channel.messages.fetch().then((messages) => {
    messages.forEach((message) => {
      message.delete();
    });
  });

  const getInFlightTime = (depTime) => {
    const depTimeAct = new Date(depTime);
    const currentTime = new Date();
    const diffInMinutes = Math.round((currentTime - depTimeAct) / (1000 * 60));
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;

    return `${hours}h ${minutes}min`;
  }

  setInterval(() => {
    fetchFlights((currentFlights) => {
      currentFlights = [];
      let embeds = [];

      embeds[0] = new EmbedBuilder()
        .setTitle("✈️ Ongoing PAFFSair flights")
        .setColor("#00AA00")
      
      embeds[1] = new EmbedBuilder()
        .setColor("#FFFFFF")
        .setFooter({ text: `Last updated: ${new Date().toLocaleString()}` });

      if (currentFlights.length === 0) {
        embeds[1].setDescription("No flights at the moment 😔");
      } else {
        currentFlights.forEach((flight) => {
          embeds[1].addFields(
            { name: `${flight.airline.icao}${flight.flightNumber} - ${flight.pilot.fullname.split(' ')[0]}`, value: `**Dep**: ${flight.dep.icao} | **Arr**: ${flight.arr.icao} | **In flight**: ${getInFlightTime(flight.depTimeAct)} | **Aircraft**: ${flight.aircraft.airframe.icao} | **Network**: ${flight.network.name === 'vatsim' ? 'VATSIM' : '-'}` },
            { name: '\n', value: '\n' },
          );
        });
      }

      if (messageToEdit) {
        messageToEdit.edit({ embeds: embeds });
      } else {
        channel.send({ embeds: embeds }).then(sentMessage => {
          messageToEdit = sentMessage;
        });
      }
    });
  }, 180000); // 3 minutes
});

client.login(BOT_TOKEN);
