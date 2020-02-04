const axios = require("axios");
const bytes = require("bytes");
const {DateTime} = require("luxon");

const SCHEDULE_URL =
  "https://raw.githubusercontent.com/nodejs/Release/master/schedule.json";

module.exports = {
  getSchedule
};

async function getSchedule() {
  const now = Date.now();
  const res = await axios.get(SCHEDULE_URL);
  const versions = Object.entries(res.data)
    .map(([version, item]) => {
      item.start = new Date(item.start);
      item.start2 = relativeDate(item.start);
      item.end = new Date(item.end);
      item.end2 = relativeDate(item.end);
      if (item.maintenance) {
        item.maintenance = new Date(item.maintenance);
        item.maintenance2 = relativeDate(item.maintenance);
      }
      if (item.lts) {
        item.lts = new Date(item.lts);
        item.lts2 = relativeDate(item.lts);
      }
      return Object.assign({ version }, item);
    })
    .filter(item => item.start < now && item.end > now);
  
  for (const item of versions) {
    const latest = await getLatestVersion(item.version);
    latest.file2 = latest.file.match(/^node-(v.*?)\.pkg$/)[1];
    latest.date = new Date(latest.date);
    latest.date2 = relativeDate(latest.date);
    latest.size = Number(latest.size);
    latest.size2 = bytes(latest.size);
    item.latest = latest;
  }
  return versions;
}

async function getLatestVersion(channel) {
  const uri = `https://nodejs.org/dist/latest-${ channel }.x/`;
  const res = await axios.get(uri);

  // Pretty gross regex to parse something like the following:
  // "<a href="node-v12.14.1.pkg">node-v12.14.1.pkg</a>       07-Jan-2020 13:17     19757290"
  const re = /^<a href=".*?">(?<file>.*?\.pkg)<\/a>\s+(?<date>\d{2}-[a-z]{3}-\d{4}\s\d{2}:\d{2})\s+(?<size>\d+)$/im;
  const rows = res.data.match(re);
  return Object.assign({ ...rows.groups }, {uri});
}

function relativeDate(dateObj) {
  return DateTime.fromJSDate(dateObj).toRelative()
}
