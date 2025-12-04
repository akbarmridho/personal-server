const fs = require("fs");
const path = require("path");

// 📁 Change this to your folder
const FOLDER_PATH = "./cheerio_output";

fs.readdir(FOLDER_PATH, (err, files) => {
  if (err) return console.error("Error reading folder:", err);

  const mdFiles = files.filter((f) => f.endsWith(".md"));

  mdFiles.forEach((file) => {
    const filePath = path.join(FOLDER_PATH, file);
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    const newLines = [];
    let skipping = false;
    let endFound = false;

    // Regex to detect ANY "What to Watch For/for"
    // const watchRegex = /what\s+to\s+watch\s+for/i;
    // ### **Saham Top Gainer Hari Ini** 🔥

    // ### **Saham Top Loser Hari Ini** 🤕
    // ### 🔥 **Hal lain yang

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // If line contains "What to Watch For" in any form → START SKIPPING
      // if (watchRegex.test(line)) {
      //   skipping = true;
      //   continue;
      // }
      if (line.includes("**Daily Market Performance 🚀**")) {
        skipping = true;
        continue;
      }

      // Stop skipping when next level-3 heading appears
      if (skipping && line.trim().includes("**👋 Stockbitor!**")) {
        skipping = false;
        endFound = true;
      }

      if (!skipping) {
        newLines.push(line);
      }
    }

    if (endFound) {
      fs.writeFileSync(filePath, newLines.join("\n"), "utf8");
      console.log(`✔ Cleaned: ${file}`);
    }
  });
});
