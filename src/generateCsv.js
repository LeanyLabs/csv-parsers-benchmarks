const fs = require("fs");
const util = require("util");
const stream = require("stream");
const { once } = require("events");

const finished = util.promisify(stream.finished); // (A)

async function generateCsv({ fileName, columns, rows, quotes }) {
  const file = fs.createWriteStream(fileName, { encoding: "utf8" });

  const writeLine = async (line) => {
    if (!file.write(line)) {
      await once(file, "drain");
    }
  };

  const headers = Array.from({ length: columns + 1 }, (_, i) => `col${i}`);
  // write header
  await writeLine("num," + headers.join(",") + "\n");
  for (let i = 0; i < rows; ++i) {
    const line =
      `${i},` +
      headers
        .map((x) => {
          const value = x + "_" + i;
          return quotes ? '"' + value + '"' : value;
        })
        .join(",") +
      "\n";
    await writeLine(line);
  }

  file.end();

  await finished(file);
}

module.exports = { generateCsv };
