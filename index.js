import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

var BOT_TOKEN = process.env.BOT_TOKEN;
var NEWSKY_API_TOKEN = process.env.NEWSKY_API_TOKEN;

var CHANNEL_ID_ONLINE = process.env.CHANNEL_ID_ONLINE;

var CHANNEL_ID_PEAKS = process.env.CHANNEL_ID_PEAKS;

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

const fetchRecentFlights = async (callback) => {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  const response = await fetch("https://newsky.app/api/airline-api/flights/recent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${NEWSKY_API_TOKEN}`
    },
    body: JSON.stringify({ start: todayDate.toISOString() }),
  });

  if (response.ok) {
    const data = await response.json();
    callback(data.results);
  }
}

let messageToEdit = null;

client.on("ready", async () => {
  const onlineChannel = client.channels.cache.get(CHANNEL_ID_ONLINE);

  if (!onlineChannel) { console.error('The online channel not found'); return; }

  onlineChannel.messages.fetch().then((messages) => {
    messages.forEach((message) => {
      message.delete();
    });
  });

  const getInFlightTime = (depTime) => {
    if (depTime === null) {
      return "0h 0min";
    }

    const depTimeAct = new Date(depTime);
    const currentTime = new Date();
    const diffInMinutes = Math.round((currentTime - depTimeAct) / (1000 * 60));
    const hours = Math.floor(diffInMinutes / 60);
    const minutes = diffInMinutes % 60;

    return `${hours}h ${minutes}min`;
  }

  setInterval(() => {
    fetchFlights((currentFlights) => {
      let embeds = [];

      embeds[0] = new EmbedBuilder()
        .setTitle("✈️ Ongoing Newsky flights")
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
        onlineChannel.send({ embeds: embeds }).then(sentMessage => {
          messageToEdit = sentMessage;
        });
      }
    });

    const peaksChannel = client.channels.cache.get(CHANNEL_ID_PEAKS);

    if (!peaksChannel) { console.error('The peaks channel not found'); return; }

    const currentDateTime = new Date();
    if (currentDateTime.getHours() === 23 && currentDateTime.getMinutes() === 59) {
      fetchRecentFlights((recentFlights) => {
        let totalRating = 0;
        let totalDuration = 0;
        let totalDistance = 0;
        let vatsimFlights = 0;
        let totalPassangers = 0;
    
        recentFlights.forEach(flight => {
            if (flight.close) {
              totalRating += flight.rating || 0;
              totalDuration += flight.durationAct || 0;
              totalDistance += flight.result.totals.distance || 0;
              totalPassangers += flight.payload.pax || 0;

              if (flight.network?.name === 'vatsim') {
                vatsimFlights++;
              }
            }
        });

        const averageRating = totalRating / recentFlights.length;
        let embed = new EmbedBuilder()
          .setTitle(`📈 ${recentFlights[0].airline?.shortname} Daily Summary`)
          .setColor("#FFFFFF")
          .addFields(
            { name: "Total flights", value: recentFlights.length.toString(), inline: true },
            { name: "Total duration", value: `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}min`, inline: true },
            { name: "Total passangers", value: totalPassangers.toString(), inline: true },
            { name: "VATSIM flights", value: vatsimFlights.toString(), inline: true },
            { name: "Total distance", value: `${totalDistance}nm`, inline: true },
            { name: "Average rating", value: averageRating.toString(), inline: true },
          )

        peaksChannel.send({ embeds: [embed] });
      });
    }
  }, 60000); // 1 minute
});

client.login(BOT_TOKEN);
