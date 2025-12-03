# Web Scraper with Playwright

This is a web scraper built with Playwright that navigates through pages by following `.next-item` class links and saves the raw HTML content to the `raw_output` folder.

## Setup

1. Install Playwright globally (as mentioned):

   ```bash
   npm install -g playwright
   ```

2. Install the necessary browsers:

   ```bash
   npx playwright install
   ```

## Configuration

Edit the `config.json` file to set your starting URL:

```json
{
  "seedUrl": "https://example.com",
  "lastUrl": ""
}
```

- `seedUrl`: The initial URL to start scraping from
- `lastUrl`: The last URL that was processed (used for resuming)

## Usage

Run the scraper:

```bash
node scraper.js
```

## How it Works

1. The scraper starts from the `seedUrl` or `lastUrl` (if resuming)
2. It navigates to each page and saves the raw HTML content to the `raw_output` folder
3. It looks for elements with the class `.next-item` to find the next page to scrape
4. Between each page request, it waits for 5 seconds
5. After each page is processed, it updates the `lastUrl` in the config file
6. The process continues until no `.next-item` element is found

## File Naming

The saved HTML files are named using the following pattern:
`{hostname}_{pathname}_{timestamp}.html`

Example: `example.com_path_2025-12-03T13-22-00-000Z.html`

## Resuming Scraping

If the scraper is interrupted, you can resume from the last processed page by simply running it again. The script will automatically detect the `lastUrl` in the config file and continue from there.

## Notes

- The scraper runs with a visible browser window (`headless: false`) for debugging purposes
- Each page is saved with a timestamp to prevent overwriting
- The script handles relative URLs by resolving them against the current page URL
- Error handling ensures the last processed URL is always saved, even if an error occurs
