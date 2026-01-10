import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import {
  ChannelType,
  Client,
  Events,
  REST,
  Routes,
  type TextChannel,
  ThreadAutoArchiveDuration,
} from "discord.js";
import { logger } from "../utils/logger.js";
import {
  commands,
  handleIngestPdfFile,
  handleIngestPdfUrl,
  handleIngestText,
  handlePdfFileModalSubmit,
  handlePdfUrlModalSubmit,
  handleTextModalSubmit,
} from "./discord-commands.js";
import { env } from "./env.js";

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1750,
  chunkOverlap: 0,
  lengthFunction: (text) => text.length,
  separators: [
    "\n\n",
    "\n",
    " ",
    ".",
    ",",
    "\u200b", // Zero-width space
    "\uff0c", // Fullwidth comma
    "\u3001", // Ideographic comma
    "\uff0e", // Fullwidth full stop
    "\u3002", // Ideographic stop
    "",
  ],
});

class DiscordService {
  private client: Client;
  private rest: REST;

  constructor() {
    this.rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
    this.client = new Client({
      intents: ["Guilds", "GuildMessages", "MessageContent"],
    });
    this.initialize();
  }

  private async initialize() {
    await this.registerCommands();
    this.setupEventHandlers();
    await this.client.login(env.DISCORD_TOKEN);
  }

  private async registerCommands() {
    const allCommands = [
      {
        name: "ping",
        description: "Replies with Pong!",
      },
      ...commands, // Include manual ingestion commands
    ];

    try {
      logger.info("Started refreshing application (/) commands.");
      await this.rest.put(
        Routes.applicationCommands(env.DISCORD_APPLICATION_ID),
        { body: allCommands },
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
      // Handle chat input commands
      if (interaction.isChatInputCommand()) {
        if (interaction.commandName === "ping") {
          await interaction.reply("Pong!");
        } else if (interaction.commandName === "ingest-pdf") {
          const subcommand = interaction.options.getSubcommand();
          if (subcommand === "url") {
            await handleIngestPdfUrl(interaction);
          } else if (subcommand === "file") {
            await handleIngestPdfFile(interaction);
          }
        } else if (interaction.commandName === "ingest-text") {
          await handleIngestText(interaction);
        }
      }

      // Handle modal submissions
      if (interaction.isModalSubmit()) {
        if (interaction.customId === "modal-pdf-url") {
          await handlePdfUrlModalSubmit(interaction);
        } else if (interaction.customId.startsWith("modal-pdf-file:")) {
          await handlePdfFileModalSubmit(interaction);
        } else if (interaction.customId === "modal-text-input") {
          await handleTextModalSubmit(interaction);
        }
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

    const MAX_CONTENT_LENGTH = 1750;
    const truncated =
      content.length > MAX_CONTENT_LENGTH
        ? content.slice(0, 2000) + "\n...\n" + content.slice(-1500)
        : content;

    await channel.send({
      content: truncated,
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

  async createThread(
    channelId: string,
    title: string,
    content: string,
    metadata?: Record<string, unknown>,
  ) {
    const channel = await this.client.channels.fetch(channelId);

    if (
      !channel ||
      (channel.type !== ChannelType.GuildText &&
        channel.type !== ChannelType.GuildAnnouncement)
    ) {
      throw new Error(
        "Invalid channel: Must be a Text or Announcement channel",
      );
    }

    const chunks = await splitter.splitText(content);

    const thread = await (channel as TextChannel).threads.create({
      name: title,
      autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
      type: ChannelType.PublicThread,
      reason: "Bot generated standalone thread",
    });

    for (const chunk of chunks) {
      await thread.send(chunk);
    }

    if (metadata) {
      await thread.send(
        Object.entries(metadata)
          .map(([key, value]) => `**${key}**: ${value}`)
          .join("\n"),
      );
    }
  }
}

export const discordService = new DiscordService();
