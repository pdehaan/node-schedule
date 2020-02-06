#!/usr/bin/env node

const lib = require("./lib");

main()
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

async function main() {
  const res = await lib.getSchedule(process.env.NOTES);
  console.log(JSON.stringify(res, null, 2));
}
