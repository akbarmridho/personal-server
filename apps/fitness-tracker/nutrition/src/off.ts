import { createOpenFoodFactsClient } from "./search/openfoodfacts.js";
import { logger } from "./utils/logger.js";

async function main() {
  const searchOpenFoodFacts = createOpenFoodFactsClient();

  const queries = ["mi goreng", "indomie", "Indomie Mi Goreng"];
  for (const query of queries) {
    const output = await searchOpenFoodFacts(query, 5);
    logger.info({ query, output });
  }
}

main();
