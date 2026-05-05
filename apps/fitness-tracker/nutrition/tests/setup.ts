import { afterAll, beforeAll } from "vitest";
import { cleanupTestUser } from "./helpers.js";

// Clean up test user data before and after each test file
beforeAll(async () => {
  await cleanupTestUser();
});

afterAll(async () => {
  await cleanupTestUser();
});
