const cheerio = require("cheerio");
const fs = require("fs/promises");
const prettier = require("prettier");
const tidy = require("htmltidy2");
const TurndownService = require("turndown");

const turndownService = new TurndownService();
const sample = 0;

const fixHtml = async (html) => {
  return await new Promise((resolve, reject) => {
    tidy.tidy(html, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
};

async function formatHtml(unformatted) {
  try {
    const formatted = await prettier.format(unformatted, {
      parser: "html",
      plugins: [await import("prettier/plugins/html")],
      proseWrap: "never",
    });

    return formatted;
  } catch (error) {
    console.error("Error formatting Markdown:", error);
    throw error;
  }
}

function cleanHtml($) {
  // Remove unwanted tags
  $("script").remove();
  $("style").remove();
  $("meta").remove();
  $("link").remove();

  $("[style]").each(function () {
    $(this).removeAttr("style");
  });

  // Remove comments
  $("*")
    .contents()
    .each(function () {
      if (this.type === "comment") {
        $(this).remove();
      }
    });

  // Replace SVG inner content
  $("svg").each(function () {
    const svg = $(this);
    svg.html("this is a placeholder");
  });

  // Replace base64 images
  $('img[src^="data:image/"]').each(function () {
    $(this).attr("src", "#");
  });

  return $;
}

function cleanText(str) {
  return (
    str
      // Normalize whitespace
      .replace(/\s+/g, " ")
      // Remove "— Stockbit Snips" and everything after it
      .replace(/— Stockbit Snips[\s\S]*$/i, "")
      // Trim
      .trim()
  );
}

async function main() {
  let files = await fs.readdir("./raw_output");

  if (sample !== 0) {
    files.sort(() => Math.random() - 0.5);
    files = files.slice(0, sample);
  }

  for (const file of files) {
    console.log(`Processing ${file}`);
    const html = await fs.readFile(`./raw_output/${file}`, "utf-8");
    let $ = cheerio.load(await fixHtml(html));

    const title = cleanText($("title").text());
    // — Stockbit Snips
    const datePublished = $('meta[itemprop="datePublished"]').attr("content");

    $ = cleanHtml($);
    const content = cheerio.load($("article").first().html());

    content("h1").remove();
    content("footer").remove();
    content(".comments-wrapper").remove();
    content(".meta").remove();
    content(".author").remove();
    // removeSectorDailyNews(content);
    // removeStockbitSymbolBlock(content);

    // remove all style attr and style elements

    const htmlFormatted = await formatHtml(content.html());

    // await fs.writeFile(`cheerio_output/${file}`, htmlFormatted);
    // await fs.writeFile(
    //   `cheerio_output/${file.replace(".html", ".json")}`,
    //   JSON.stringify({ title, datePublished }, null, 2),
    // );
    // await fs.writeFile(`cheerio_output/${datePublished}.html`, htmlFormatted);
    await fs.writeFile(
      `cheerio_output/${datePublished}.md`,
      `# ${title}\n\n${turndownService.turndown(htmlFormatted)}`,
    );
  }
}

main();
