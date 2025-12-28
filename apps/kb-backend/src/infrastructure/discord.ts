import { Client, Events, REST, Routes } from "discord.js";
import { logger } from "../utils/logger.js";
import { env } from "./env.js";

class DiscordService {
  private client: Client;
  private rest: REST;

  constructor() {
    this.rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
    this.client = new Client({ intents: 6758133188787264 });
    this.initialize();
  }

  private async initialize() {
    await this.registerCommands();
    this.setupEventHandlers();
    await this.client.login(env.DISCORD_TOKEN);
  }

  private async registerCommands() {
    const commands = [
      {
        name: "ping",
        description: "Replies with Pong!",
      },
    ];

    try {
      logger.info("Started refreshing application (/) commands.");
      await this.rest.put(
        Routes.applicationCommands(env.DISCORD_APPLICATION_ID),
        { body: commands },
      );
      logger.info("Successfully reloaded application (/) commands.");
    } catch (error) {
      logger.error(error);
    }
  }

  private setupEventHandlers() {
    this.client.on(Events.ClientReady, (readyClient) => {
      logger.info(`Logged in as ${readyClient.user.tag}!`);
    });

    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      if (interaction.commandName === "ping") {
        await interaction.reply("Pong!");
      }
    });
  }

  async sendMessage(
    channelId: string,
    content: string,
    metadata?: Record<string, unknown>,
  ) {
    const channel = await this.client.channels.fetch(channelId);
    if (!channel?.isTextBased() || !("send" in channel)) {
      throw new Error("Invalid channel");
    }

    await channel.send({
      content: content,
      embeds: metadata
        ? [
            {
              fields: Object.entries(metadata).map(([key, value]) => ({
                name: key,
                value: String(value),
                inline: true,
              })),
              color: 0x5865f2,
            },
          ]
        : undefined,
    });
  }
}

export const discordService = new DiscordService();
