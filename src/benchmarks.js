const fs = require("fs");
const csvParse = require("csv-parse");
const csvParser = require("csv-parser");
const dekkai = require("dekkai/dist/umd/dekkai");
const fastCsv = require("fast-csv");
const Papa = require("papaparse");

async function benchmark(name, func, { cycles = 10 }) {
  // warm up
  try {
    await func();

    const start = Date.now();
    for (let i = 0; i < cycles; ++i) {
      await func();
    }
    const elapsed = Date.now() - start;
    console.log(`${name}: ${(elapsed / cycles).toFixed(2)} ms`);
  } catch (e) {
    console.error(`${name}: crashed`, e);
  }
}

async function parseManual(fileName) {
  const lines = (
    await fs.promises.readFile(fileName, { encoding: "utf8" })
  ).split("\n");
  lines.splice(0, 1);
  return lines.map((line) => line.split(","));
}

function parseCsvStream(fileName, csv) {
  return new Promise((resolve) => {
    let header = true;
    const data = [];
    fs.createReadStream(fileName)
      .pipe(csv())
      .on("data", (line) => {
        if (header) {
          header = false;
        } else {
          data.push(line);
        }
      })
      .on("end", () => {
        resolve(data);
      })
      .on("finish", () => {
        resolve(data);
      });
  });
}

async function parseDekkai(fileName) {
  const fd = await new Promise((resolve, reject) => {
    fs.open(fileName, (err, fd) => {
      if (err) {
        reject(err);
      } else {
        resolve(fd);
      }
    });
  });

  const data = [];
  const table = await dekkai.tableFromLocalFile(fd);

  await table.forEach((row) => {
    const arr = [];
    row.forEach((v) => arr.push(v));
    data.push(arr);
  });

  // console.log(data);
  return data;
}

async function benchmarkParsers({ name, fileName, rows, quotes, cycles }) {
  const expectedSum = (rows * (rows - 1)) / 2;

  const checkLines = (lines) => {
    const sum = lines.reduce((p, x) => p + +x[0], 0);
    if (sum !== expectedSum) throw new Error("Test Failed. Sum: " + sum);
  };

  console.log(`Running ${name}`);
  if (!quotes) {
    await benchmark(
      "String.split",
      async () => {
        const lines = await parseManual(fileName);
        checkLines(lines);
      },
      { cycles }
    );
  }

  if (rows <= 10000) {
    // it crashes the whole process on 100k
    await benchmark(
      "dekkai",
      async () => {
        const lines = await parseDekkai(fileName);
        checkLines(lines);
      },
      { cycles }
    );
  }

  await benchmark(
    "papaparse",
    async () => {
      const lines = await parseCsvStream(fileName, () =>
        Papa.parse(Papa.NODE_STREAM_INPUT, {
          fastMode: !quotes,
        })
      );
      checkLines(lines);
    },
    { cycles }
  );

  await benchmark(
    "csv-parser",
    async () => {
      const lines = await parseCsvStream(fileName, () =>
        csvParser({ headers: false })
      );
      checkLines(lines);
    },
    { cycles }
  );

  await benchmark(
    "csv-parse",
    async () => {
      const lines = await parseCsvStream(fileName, csvParse);
      checkLines(lines);
    },
    { cycles }
  );

  await benchmark(
    "fast-csv",
    async () => {
      const lines = await parseCsvStream(fileName, () =>
        fastCsv.parse({ headers: false })
      );
      checkLines(lines);
    },
    { cycles }
  );
}

module.exports = {
  benchmarkParsers,
};
