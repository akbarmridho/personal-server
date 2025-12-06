const fs = require("fs");

const inputFile = "dataset.json"; // original JSON file
const outputFile = "dataset.json"; // overwrite same file

// Read and parse JSON
const raw = fs.readFileSync(inputFile, "utf8");
const data = JSON.parse(raw);

const result = [];

data.forEach((item) => {
  const { date, content } = item;

  const lines = content
    .split("\n") // split into lines
    .map((l) => l.trim()) // trim each line
    .filter((l) => l.length > 0); // remove empty lines

  const chunks = [];
  let current = [];

  lines.forEach((line) => {
    if (line.startsWith("* [$")) {
      // when a new bullet starts → push previous chunk
      if (current.length > 0) {
        chunks.push(current.join("\n"));
        current = [];
      }
    }
    current.push(line);
  });

  // push last chunk
  if (current.length > 0) {
    chunks.push(current.join("\n"));
  }

  // Build result objects
  chunks.forEach((chunk) => {
    result.push({
      date,
      content: chunk,
    });
  });
});

// Save with 2-space indentation
fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), "utf8");

console.log("Done!");
