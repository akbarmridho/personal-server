import readline from "node:readline";
import { TelegramClient } from "telegram";
import { env } from "../infrastructure/env.js";
import { telegramSession } from "../infrastructure/telegram.js";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

(async () => {
  console.log("Loading interactive example...");
  const client = new TelegramClient(
    telegramSession,
    env.TELEGRAM_API_ID,
    env.TELEGRAM_API_HASH,
    {
      connectionRetries: 5,
    },
  );
  await client.start({
    phoneNumber: async () =>
      new Promise((resolve) =>
        rl.question("Please enter your number: ", resolve),
      ),
    password: async () =>
      new Promise((resolve) =>
        rl.question("Please enter your password: ", resolve),
      ),
    phoneCode: async () =>
      new Promise((resolve) =>
        rl.question("Please enter the code you received: ", resolve),
      ),
    onError: (err) => console.log(err),
  });
  console.log("You should now be connected.");
  console.log(client.session.save());
  await client.sendMessage("me", { message: "Hello!" });

  process.exit(0);
})();
