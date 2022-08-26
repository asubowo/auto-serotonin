/*
 * @author Andrew Subowo
 * @version 2.0 Introduced /metro commands to pull metro data from WMATA APIs
 */

require('dotenv').config({ path: '../.env' });
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const https = require('https');
const PRIMARY_API_KEY = process.env.WMATA_PRIMARY_KEY;
const SECONDARY_API_KEY = process.env.WMATA_SECONDARY_KEY;


module.exports = {
  data: new SlashCommandBuilder()
    .setName('metro')
    .setDescription('Get WMATA information')
    .addSubcommand(subcommand =>
      subcommand
        .setName('station')
        .setDescription('Get station info')
        .addStringOption(option => option.setName('stationname').setDescription('The station name to select').setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('Get rail service statuses from WMATA.')),


  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false });

    let subcommand = interaction.options.getSubcommand();

    if (subcommand === 'status') {
      var get_options = {
        host: 'api.wmata.com',
        port: 443,
        path: '/Incidents.svc/json/Incidents',
        headers: {
          'api_key': PRIMARY_API_KEY
        }
      }

      let embed = new EmbedBuilder()

      await https.get(get_options, (resp) => {
        let data = '';
        resp.on('data', (chunk) => {
          data += chunk;
        });

        resp.on('end', () => {
          const res = JSON.parse(data);
          const incidents = res.Incidents;
          embed.setColor('#0099ff')
            .setTitle('Washington Metro Status Updates')
            .setURL('https://www.wmata.com/service/status/')
            .setAuthor({ name: 'WMATA', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/WMATA_Metro_Logo.svg/800px-WMATA_Metro_Logo.svg.png' })
            .setTimestamp();

          for (var incident = 0; incident < res.Incidents.length; incident++) {
            const lineAffected = incidents[incident].LinesAffected.toString().split('\;')[0];
            const description = incidents[incident].Description.toString();
            embed.addFields({ name: lineAffected, value: description });
          }

          return interaction.editReply({ embeds: [embed] });
        });

        resp.on('error', (err) => {
          console.log(err);
          return interaction.editReply({ content: 'This service is not available at this time.', ephemeral: true })
        })
      });

    } // end of status

    if (subcommand === 'station') {

      const station = interaction.options.getString('stationname');

      var get_options = {
        host: 'api.wmata.com',
        port: 443,
        path: '/StationPrediction.svc/json/GetPrediction/All',
        headers: {
          'api_key': PRIMARY_API_KEY
        }
      }

      https.get(get_options, (resp) => {
        let data = '';
        let stationList = [];
        resp.on('data', (chunk) => {
          data += chunk;
        });

        resp.on('end', () => {
          let embed = new EmbedBuilder()
          embed.setColor('#0099ff')
            .setURL('https://www.wmata.com/rider-guide/stations/')
            .setAuthor({ name: 'WMATA', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/WMATA_Metro_Logo.svg/800px-WMATA_Metro_Logo.svg.png' })
            .setTimestamp();
          const res = JSON.parse(data);
          const stations = res.Trains;

          let destination = []
          let min = []
          let line = [];
          for (var i = 0; i < res.Trains.length; i++) {
            
            if (stations[i].LocationName.toString().toLowerCase().match(station.toLowerCase())) {
              destination = [...destination, stations[i].Destination.toString()];
              min = [...min, stations[i].Min.toString()];
              line = [...line, stations[i].Line.toString()];
            }
          }

          if (destination.length == 0) {
            return interaction.editReply({ content: 'Could not find info for ' + station, ephemeral: true })
          } else {
            embed.setTitle('Station information for ' + station.toUpperCase())
            let destinations = "";
            let mins = "";
            let lines = "";
            for (var i = 0; i < destination.length; i++) {
              destinations = destinations + destination[i] + '\n'
              lines = lines + line[i] + '\n'
              mins = mins + min[i] + '\n'
            }
  
            embed.addFields(
              { name: 'LN', value: lines, inline: true },
              { name: 'DEST', value: destinations, inline: true },
              { name: 'MIN', value: mins, inline: true}
              )
  
            return interaction.editReply({ embeds: [embed] });
          }
        })
      })
    }
  }

}

