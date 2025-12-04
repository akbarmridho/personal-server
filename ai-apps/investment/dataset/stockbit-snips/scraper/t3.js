const fs = require("fs");
const path = require("path");

// 📁 Change this to your folder
const FOLDER_PATH = "./cheerio_output";

const TARGET_LINE = "##### Kutipan menarik dari komunitas Stockbit minggu ini";
const LINES_BEFORE = 5;

fs.readdir(FOLDER_PATH, (err, files) => {
  if (err) return console.error("Error reading folder:", err);

  const mdFiles = files.filter((f) => f.endsWith(".md"));

  mdFiles.forEach((file) => {
    const filePath = path.join(FOLDER_PATH, file);
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    const targetIndex = lines.findIndex((line) => line.trim() === TARGET_LINE);

    if (targetIndex === -1) {
      console.log(`⚠ Target not found in: ${file}`);
      return;
    }

    // Start removing 5 lines before the target
    const cutStart = Math.max(0, targetIndex - LINES_BEFORE);

    // Keep only lines BEFORE cutStart
    const newLines = lines.slice(0, cutStart);

    fs.writeFileSync(filePath, newLines.join("\n"), "utf8");

    console.log(`✔ Cleaned: ${file}`);
  });
});
