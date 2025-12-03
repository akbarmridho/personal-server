const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

// Load configuration
const config = JSON.parse(fs.readFileSync("config.json", "utf8"));

// Helper function to resolve URLs
function resolveUrl(baseUrl, href) {
  try {
    return new URL(href, baseUrl).href;
  } catch (error) {
    console.error(`Error resolving URL: ${href}`, error.message);
    return null;
  }
}

// Helper function to save HTML content
function saveHtmlContent(url, content) {
  // Create a filename from URL
  const urlObj = new URL(url);
  const hostname = urlObj.hostname.replace(/[^a-zA-Z0-9]/g, "_");
  const pathname = urlObj.pathname.replace(/[^a-zA-Z0-9]/g, "_");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${hostname}${pathname}_${timestamp}.html`;

  const filePath = path.join("raw_output", filename);
  fs.writeFileSync(filePath, content);
  console.log(`Saved content to: ${filePath}`);
  return filePath;
}

// Helper function to update config with last URL
function updateConfig(lastUrl) {
  config.lastUrl = lastUrl;
  fs.writeFileSync("config.json", JSON.stringify(config, null, 2));
  console.log(`Updated config with lastUrl: ${lastUrl}`);
}

// Main scraping function
async function scrape() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Determine starting URL
    const startUrl = config.lastUrl || config.seedUrl;
    console.log(`Starting scrape from: ${startUrl}`);

    let currentUrl = startUrl;
    let hasNextPage = true;
    let pageCount = 0;

    while (hasNextPage) {
      pageCount++;
      console.log(`\nProcessing page ${pageCount}: ${currentUrl}`);

      // Navigate to the current URL
      await page.goto(currentUrl, { waitUntil: "domcontentloaded" });

      // Wait a bit to ensure content is loaded
      await page.waitForTimeout(500);

      // Get the HTML content
      const htmlContent = await page.content();

      // Save the HTML content
      saveHtmlContent(currentUrl, htmlContent);

      // Try to find the next item link
      const nextItemExists = (await page.locator(".next-item").count()) > 0;

      if (nextItemExists) {
        // Get the href attribute of the next item
        const href = await page.locator(".next-item").getAttribute("href");

        if (href) {
          // Resolve the URL
          const nextUrl = resolveUrl(currentUrl, href);

          if (nextUrl) {
            console.log(`Found next URL: ${nextUrl}`);

            // Update config with current URL before moving to next
            updateConfig(currentUrl);

            // Sleep for 5 seconds before next request
            console.log("Sleeping for 1 seconds...");
            await page.waitForTimeout(1000);

            // Move to next URL
            currentUrl = nextUrl;
          } else {
            console.log("Failed to resolve next URL");
            hasNextPage = false;
          }
        } else {
          console.log("Found .next-item element but no href attribute");
          hasNextPage = false;
        }
      } else {
        console.log("No .next-item element found on this page");
        hasNextPage = false;
      }
    }

    // Update config with the last processed URL
    updateConfig(currentUrl);
    console.log(`\nScraping completed. Processed ${pageCount} pages.`);
  } catch (error) {
    console.error("Error during scraping:", error);
    // Save current URL even if error occurred
    if (currentUrl) {
      updateConfig(currentUrl);
    }
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrape().catch(console.error);
