const util = require("util");

const axios = require("axios");
const matter = require("gray-matter");
const { DateTime } = require("luxon");
const $nodeVersionData = require("node-version-data");
const md = require("markdown-it")();

const SCHEDULE_URL =
  "https://raw.githubusercontent.com/nodejs/Release/master/schedule.json";
const nodeVersionData = util.promisify($nodeVersionData);

module.exports = {
  getSchedule,
  fetchReleaseNotes,
  relativeDate,
  SCHEDULE_URL,
  nodeVersionData
};

async function getSchedule(includeBlogPost = false, includeReleases = false) {
  let versionData = await nodeVersionData();
  versionData = versionData.map(({ files, ...rest }) => rest);

  const now = Date.now();
  const res = await axios.get(SCHEDULE_URL);
  const versions = Object.entries(res.data)
    .map(([version, item]) => {
      item.start = new Date(item.start);
      // item.start2 = relativeDate(item.start);
      item.end = new Date(item.end);
      // item.end2 = relativeDate(item.end);
      if (item.maintenance) {
        item.maintenance = new Date(item.maintenance);
        // item.maintenance2 = relativeDate(item.maintenance);
      }
      if (item.lts) {
        item.lts = new Date(item.lts);
        // item.lts2 = relativeDate(item.lts);
      }
      item.latest = versionData.find(release =>
        release.version.startsWith(version)
      );
      if (item.latest) {
        item.latest.date = new Date(item.latest.date);
        // item.latest.date2 = relativeDate(item.latest.date);
      }

      if (includeReleases) {
        item.releases = versionData.filter(release =>
          release.version.startsWith(version)
        );
      }
      return Object.assign({ version }, item);
    })
    .filter(item => item.start < now && item.end > now)
    .reverse();

  if (includeBlogPost) {
    // Fetch the blog post for any active (non-filtered) releases.
    for (const release of versions) {
      release.latest.notes = await fetchReleaseNotes(release.latest.version);
      release.latest.notes.html = md
        .render(release.latest.notes.content)
        .replace(/&lt;br&gt;/g, "<br/>");
    }
  }
  return versions;
}

function relativeDate(date) {
  date = new Date(date);
  return DateTime.fromJSDate(date).toRelative();
}

async function fetchReleaseNotes(version) {
  const uri = `https://raw.githubusercontent.com/nodejs/nodejs.org/master/locale/en/blog/release/${version}.md`;
  const res = await axios.get(uri);
  const md = res.data.trim();
  return matter(md);
}
