const { generateCsv } = require("./generateCsv");
const path = require("path");
const { benchmarkParsers } = require("./benchmarks");
const dekkai = require("dekkai/dist/umd/dekkai");

const tests = [
  {
    columns: 10,
    rows: 10000,
    cycles: 20,
  },
  {
    columns: 100,
    rows: 10000,
    cycles: 10,
  },
  {
    columns: 10,
    rows: 100000,
    cycles: 5,
  },
  {
    columns: 100,
    rows: 100000,
    cycles: 5,
  },
];

async function runTests({ quotes }) {
  for (const { rows, columns, cycles } of tests) {
    const name = `${quotes ? "quotes" : "raw"}_${columns}_${rows}`;
    const fileName = path.join(__dirname, `../data/${name}.csv`);
    console.log(`\nPreparing ${fileName}...`);
    await generateCsv({ fileName, columns, rows, quotes });

    await benchmarkParsers({ rows, fileName, name, quotes, cycles });
  }
}

async function run() {
  await dekkai.init();
  try {
    await runTests({ quotes: false });
    await runTests({ quotes: true });
  } finally {
    dekkai.terminate();
  }
}

run().catch((e) => console.error("Error: ", e));
