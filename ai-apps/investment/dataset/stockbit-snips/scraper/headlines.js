const fs = require("fs/promises");

async function main() {
  const files = await fs.readdir("old-format/manual-processed");

  for (const file of files) {
    console.log(`Processing ${file}...`);
    const content = await fs.readFile(
      `old-format/manual-processed/${file}`,
      "utf-8",
    );
    const contentSplit = content.split("Berita korporasi");

    await fs.writeFile(`old-format/headlines/${file}`, contentSplit[0].trim());

    if (contentSplit.length > 1) {
      await fs.writeFile(
        `old-format/corporate/${file}`,
        contentSplit[1].trim(),
      );
    }
  }
}

main();
