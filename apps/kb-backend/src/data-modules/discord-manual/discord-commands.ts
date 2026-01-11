import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
import {
  ActionRowBuilder,
  type ChatInputCommandInteraction,
  ModalBuilder,
  type ModalSubmitInteraction,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import normalizeUrl from "normalize-url";
import { v4 as uuidv4, v5 as uuidv5 } from "uuid";
import { inngest } from "../../infrastructure/inngest.js";
import { logger } from "../../utils/logger.js";
import { convertGoogleDriveUrl, MANUAL_NAMESPACE } from "./pdf-processor.js";

dayjs.extend(utc);
dayjs.extend(timezone);

// Constants
const PDF_MAX_SIZE_MB = 10;
const TEXT_MAX_SIZE_MB = 5;

// Temporary storage for attachment info (to avoid exceeding customId 100 char limit)
const attachmentTempStorage = new Map<
  string,
  { url: string; filename: string; size: number }
>();

// Clean up temp storage entries older than 30 minutes
setInterval(
  () => {
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    for (const [key, value] of attachmentTempStorage.entries()) {
      // @ts-expect-error - accessing internal timestamp
      if (value._timestamp && value._timestamp < thirtyMinutesAgo) {
        attachmentTempStorage.delete(key);
        logger.debug(`Cleaned up temp storage entry: ${key}`);
      }
    }
  },
  5 * 60 * 1000,
); // Run cleanup every 5 minutes

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates Discord attachment for PDF file upload
 */
function validatePdfAttachment(attachment: {
  name: string;
  contentType: string | null;
  size: number;
}): void {
  // Validate file type
  const isPdf =
    attachment.contentType?.includes("pdf") ||
    attachment.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error(
      "Invalid file type. Please attach a PDF file (.pdf extension required).",
    );
  }

  // Validate file size
  const maxSizeBytes = PDF_MAX_SIZE_MB * 1024 * 1024;

  if (attachment.size > maxSizeBytes) {
    throw new Error(
      `File too large. Maximum size is ${PDF_MAX_SIZE_MB}MB (${(attachment.size / 1024 / 1024).toFixed(2)}MB provided).`,
    );
  }
}

/**
 * Validates Discord attachment for text/markdown file upload
 */
function validateTextAttachment(attachment: {
  name: string;
  contentType: string | null;
  size: number;
}): void {
  const lowerName = attachment.name.toLowerCase();

  // Validate file type
  const isTextOrMarkdown =
    attachment.contentType?.includes("text") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".markdown");

  if (!isTextOrMarkdown) {
    throw new Error(
      "Invalid file type. Please attach a text file (.txt, .md, or .markdown extension required).",
    );
  }

  // Validate file size
  const maxSizeBytes = TEXT_MAX_SIZE_MB * 1024 * 1024;

  if (attachment.size > maxSizeBytes) {
    throw new Error(
      `File too large. Maximum size is ${TEXT_MAX_SIZE_MB}MB (${(attachment.size / 1024 / 1024).toFixed(2)}MB provided).`,
    );
  }
}

// ============================================================================
// Slash Command Definitions
// ============================================================================

export const commands = [
  new SlashCommandBuilder()
    .setName("ingest-pdf")
    .setDescription("Ingest a PDF document for analysis")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("url")
        .setDescription("Ingest PDF from URL (direct or Google Drive)"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("file")
        .setDescription("Ingest PDF from file upload")
        .addAttachmentOption((option) =>
          option
            .setName("file")
            .setDescription("PDF file to ingest")
            .setRequired(true),
        ),
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName("ingest-text")
    .setDescription("Ingest text content manually (news, analysis, or rumour)")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("input")
        .setDescription("Ingest text via manual input (max 4000 chars)"),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("file")
        .setDescription("Ingest text from file upload (.txt, .md, .markdown)")
        .addAttachmentOption((option) =>
          option
            .setName("file")
            .setDescription("Text or markdown file to ingest")
            .setRequired(true),
        ),
    )
    .toJSON(),
];

// ============================================================================
// Select Menu & Modal Builders
// ============================================================================

function createDocumentTypeSelectMenu(
  customId: string,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder("Choose document type")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("News")
        .setDescription("Market news, sector updates, ticker-specific news")
        .setValue("news"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Analysis")
        .setDescription("In-depth research and analysis")
        .setValue("analysis"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Rumour")
        .setDescription("Social media threads, rumors, and speculation")
        .setValue("rumour"),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    selectMenu,
  );
}

// ============================================================================
// Modal Builders
// ============================================================================

function createPdfUrlModal(): ModalBuilder {
  return new ModalBuilder()
    .setCustomId("modal-pdf-url")
    .setTitle("Ingest PDF from URL")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("pdf-url")
          .setLabel("PDF URL (Direct or Google Drive)")
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
          .setPlaceholder("https://..."),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("document-date")
          .setLabel("Document Date (Optional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder("YYYY-MM-DD (defaults to today)"),
      ),
    );
}

function createPdfFileModal(tempId: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`modal-pdf-file:${tempId}`)
    .setTitle("Ingest PDF from File")
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("document-date")
          .setLabel("Document Date (Optional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder("YYYY-MM-DD (defaults to today)"),
      ),
    );
}

function createTextInputModal(docType: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`modal-text-input:${docType}`)
    .setTitle(`Ingest Text Document (${docType})`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("title")
          .setLabel("Title")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("content")
          .setLabel("Content")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true)
          .setMaxLength(4000),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("document-date")
          .setLabel("Document Date (Optional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder("YYYY-MM-DD (defaults to today)"),
      ),
    );
}

function createTextFileModal(tempId: string, docType: string): ModalBuilder {
  return new ModalBuilder()
    .setCustomId(`modal-text-file:${tempId}:${docType}`)
    .setTitle(`Ingest Text File (${docType})`)
    .addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("title")
          .setLabel("Title")
          .setStyle(TextInputStyle.Short)
          .setRequired(true),
      ),
      new ActionRowBuilder<TextInputBuilder>().addComponents(
        new TextInputBuilder()
          .setCustomId("document-date")
          .setLabel("Document Date (Optional)")
          .setStyle(TextInputStyle.Short)
          .setRequired(false)
          .setPlaceholder("YYYY-MM-DD (defaults to today)"),
      ),
    );
}

// ============================================================================
// Command Handlers
// ============================================================================

export async function handleIngestPdfUrl(
  interaction: ChatInputCommandInteraction,
) {
  logger.info(
    { user: interaction.user.tag },
    "Handling /ingest-pdf url command",
  );

  const modal = createPdfUrlModal();
  await interaction.showModal(modal);
}

export async function handleIngestPdfFile(
  interaction: ChatInputCommandInteraction,
) {
  logger.info(
    { user: interaction.user.tag },
    "Handling /ingest-pdf file command",
  );

  try {
    // Get file attachment from interaction
    const attachment = interaction.options.getAttachment("file", true);

    // Validate file type and size
    validatePdfAttachment({
      name: attachment.name,
      contentType: attachment.contentType,
      size: attachment.size,
    });

    // Store attachment info in temporary Map (customId has 100 char limit)
    const tempId = uuidv4();
    attachmentTempStorage.set(tempId, {
      url: attachment.url,
      filename: attachment.name,
      size: attachment.size,
      // @ts-expect-error - add timestamp for cleanup
      _timestamp: Date.now(),
    });

    logger.debug(`Stored attachment info with temp ID: ${tempId}`);

    // Show modal for date input
    const modal = createPdfFileModal(tempId);
    await interaction.showModal(modal);
  } catch (error) {
    logger.error(
      `Error in handleIngestPdfFile: ${error instanceof Error ? error.message : String(error)}`,
    );

    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ephemeral: true,
    });
  }
}

export async function handleIngestTextInput(
  interaction: ChatInputCommandInteraction,
) {
  logger.info(
    { user: interaction.user.tag },
    "Handling /ingest-text input command",
  );

  const selectMenu = createDocumentTypeSelectMenu("select-text-input-type");

  await interaction.reply({
    content:
      "📝 **Select Document Type**\nChoose the type of document you want to ingest:",
    components: [selectMenu],
    ephemeral: true,
  });
}

export async function handleIngestTextFile(
  interaction: ChatInputCommandInteraction,
) {
  logger.info(
    { user: interaction.user.tag },
    "Handling /ingest-text file command",
  );

  try {
    // Get file attachment from interaction
    const attachment = interaction.options.getAttachment("file", true);

    // Validate file type and size
    validateTextAttachment({
      name: attachment.name,
      contentType: attachment.contentType,
      size: attachment.size,
    });

    // Store attachment info in temporary Map (customId has 100 char limit)
    const tempId = uuidv4();
    attachmentTempStorage.set(tempId, {
      url: attachment.url,
      filename: attachment.name,
      size: attachment.size,
      // @ts-expect-error - add timestamp for cleanup
      _timestamp: Date.now(),
    });

    logger.debug(`Stored attachment info with temp ID: ${tempId}`);

    // Show select menu for document type selection
    const selectMenu = createDocumentTypeSelectMenu(
      `select-text-file-type:${tempId}`,
    );

    await interaction.reply({
      content: `📄 **Select Document Type for: ${attachment.name}**\nChoose the type of document you want to ingest:`,
      components: [selectMenu],
      ephemeral: true,
    });
  } catch (error) {
    logger.error(
      `Error in handleIngestTextFile: ${error instanceof Error ? error.message : String(error)}`,
    );

    await interaction.reply({
      content: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      ephemeral: true,
    });
  }
}

// ============================================================================
// Select Menu Handlers
// ============================================================================

export async function handleTextInputTypeSelect(
  interaction: StringSelectMenuInteraction,
) {
  const selectedType = interaction.values[0];

  logger.info(
    { type: selectedType, user: interaction.user.tag },
    "User selected document type for text input",
  );

  const modal = createTextInputModal(selectedType);
  await interaction.showModal(modal);
}

export async function handleTextFileTypeSelect(
  interaction: StringSelectMenuInteraction,
) {
  const selectedType = interaction.values[0];
  const tempId = interaction.customId.split(":")[1];

  logger.info(
    { type: selectedType, tempId, user: interaction.user.tag },
    "User selected document type for text file",
  );

  const modal = createTextFileModal(tempId, selectedType);
  await interaction.showModal(modal);
}

// ============================================================================
// Modal Submit Handlers
// ============================================================================

export async function handlePdfUrlModalSubmit(
  interaction: ModalSubmitInteraction,
) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // 1. Extract URL and optional date from modal
    const pdfUrl = interaction.fields.getTextInputValue("pdf-url");
    const userDate =
      interaction.fields.getTextInputValue("document-date") || null;

    logger.info(
      { url: pdfUrl, userDate, user: interaction.user.tag },
      "Processing PDF URL submission",
    );

    // 2. Convert Google Drive URLs to direct download URLs
    const processedUrl = convertGoogleDriveUrl(pdfUrl);
    const normalizedUrl = normalizeUrl(processedUrl);

    // 3. Determine date (user input or today)
    const documentDate =
      userDate || dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");

    logger.info(
      { url: normalizedUrl, date: documentDate },
      "Emitting PDF manual ingest event for URL",
    );

    // 4. Emit to Inngest PDF processing function
    await inngest.send({
      name: "data/pdf-manual-ingest",
      data: {
        pdfUrl: normalizedUrl,
        documentDate: documentDate,
        source: {
          name: "manual",
          url: normalizedUrl,
        },
      },
    });

    // 5. Reply with success
    await interaction.editReply({
      content: `✅ PDF ingestion queued!\n**URL**: ${normalizedUrl}\n**Date**: ${documentDate}\n\nProcessing will happen in the background. Check Discord notifications for completion.`,
    });
  } catch (error) {
    logger.error(
      `Error in handlePdfUrlModalSubmit: ${error instanceof Error ? error.message : String(error)}`,
    );

    await interaction.editReply({
      content: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}

export async function handlePdfFileModalSubmit(
  interaction: ModalSubmitInteraction,
) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // 1. Extract temp ID from customId and get attachment info
    const tempId = interaction.customId.split(":")[1];
    const attachmentInfo = attachmentTempStorage.get(tempId);

    if (!attachmentInfo) {
      throw new Error("Attachment info not found. Please try again.");
    }

    // 2. Extract optional date from modal
    const userDate =
      interaction.fields.getTextInputValue("document-date") || null;

    logger.info(
      {
        filename: attachmentInfo.filename,
        userDate,
        user: interaction.user.tag,
      },
      "Processing PDF file submission",
    );

    // 3. Determine date (user input or today)
    const documentDate =
      userDate || dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");

    logger.info(
      { filename: attachmentInfo.filename, date: documentDate },
      "Emitting PDF manual ingest event for file",
    );

    // 4. Emit to Inngest PDF processing function
    await inngest.send({
      name: "data/pdf-manual-ingest",
      data: {
        pdfUrl: attachmentInfo.url, // Discord CDN URL
        filename: attachmentInfo.filename,
        documentDate: documentDate,
        source: {
          name: "manual",
          filename: attachmentInfo.filename,
        },
      },
    });

    // 5. Clean up temp storage
    attachmentTempStorage.delete(tempId);
    logger.debug(`Cleaned up temp storage entry: ${tempId}`);

    // 6. Reply with success
    await interaction.editReply({
      content: `✅ PDF ingestion queued!\n**File**: ${attachmentInfo.filename}\n**Date**: ${documentDate}\n\nProcessing will happen in the background. Check Discord notifications for completion.`,
    });
  } catch (error) {
    logger.error(
      `Error in handlePdfFileModalSubmit: ${error instanceof Error ? error.message : String(error)}`,
    );

    await interaction.editReply({
      content: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}

export async function handleTextInputModalSubmit(
  interaction: ModalSubmitInteraction,
) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // 1. Extract document type from customId and fields from modal
    const docType = interaction.customId.split(":")[1];
    const title = interaction.fields.getTextInputValue("title");
    const content = interaction.fields.getTextInputValue("content");
    const userDate =
      interaction.fields.getTextInputValue("document-date") || null;

    logger.info(
      { title, type: docType, userDate, user: interaction.user.tag },
      "Processing text input submission",
    );

    // 2. Validate document type
    if (!["news", "analysis", "rumour"].includes(docType)) {
      throw new Error('Type must be "news", "analysis", or "rumour"');
    }
    const type = docType as "news" | "analysis" | "rumour";

    // 3. Determine date
    const finalDate =
      userDate || dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");

    // 4. Generate deterministic ID from content
    const docId = uuidv5(content, MANUAL_NAMESPACE);

    // 5. Create event payload
    const payload = {
      id: docId,
      type: type,
      title: title,
      content: content,
      document_date: finalDate,
      source: {
        name: "manual",
      },
      urls: [],
    };

    logger.info(
      { docId, title, type, date: finalDate },
      "Emitting manual ingest event for text input",
    );

    // 6. Emit to Inngest
    await inngest.send({
      name: "data/document-manual-ingest",
      data: { payload: [payload] },
    });

    // 7. Reply with success
    await interaction.editReply({
      content: `✅ Text ingestion started!\n**Type**: ${type}\n**Title**: ${title}\n**Date**: ${finalDate}\n**ID**: \`${docId}\``,
    });
  } catch (error) {
    logger.error(
      `Error in handleTextInputModalSubmit: ${error instanceof Error ? error.message : String(error)}`,
    );

    await interaction.editReply({
      content: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}

export async function handleTextFileModalSubmit(
  interaction: ModalSubmitInteraction,
) {
  await interaction.deferReply({ ephemeral: true });

  try {
    // 1. Extract temp ID and document type from customId, and get attachment info
    const customIdParts = interaction.customId.split(":");
    const tempId = customIdParts[1];
    const docType = customIdParts[2];
    const attachmentInfo = attachmentTempStorage.get(tempId);

    if (!attachmentInfo) {
      throw new Error("Attachment info not found. Please try again.");
    }

    // 2. Extract fields from modal
    const title = interaction.fields.getTextInputValue("title");
    const userDate =
      interaction.fields.getTextInputValue("document-date") || null;

    logger.info(
      {
        filename: attachmentInfo.filename,
        title,
        type: docType,
        userDate,
        user: interaction.user.tag,
      },
      "Processing text file submission",
    );

    // 3. Validate document type
    if (!["news", "analysis", "rumour"].includes(docType)) {
      throw new Error('Type must be "news", "analysis", or "rumour"');
    }
    const type = docType as "news" | "analysis" | "rumour";

    // 4. Determine date
    const finalDate =
      userDate || dayjs().tz("Asia/Jakarta").format("YYYY-MM-DD");

    // 5. Fetch content from Discord CDN
    const response = await fetch(attachmentInfo.url);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.statusText}`);
    }
    const content = await response.text();

    // 6. Generate deterministic ID from content
    const docId = uuidv5(content, MANUAL_NAMESPACE);

    // 7. Create event payload
    const payload = {
      id: docId,
      type: type,
      title: title,
      content: content,
      document_date: finalDate,
      source: {
        name: "manual",
        filename: attachmentInfo.filename,
      },
      urls: [],
    };

    logger.info(
      {
        docId,
        title,
        type,
        date: finalDate,
        filename: attachmentInfo.filename,
      },
      "Emitting manual ingest event for text file",
    );

    // 8. Emit to Inngest
    await inngest.send({
      name: "data/document-manual-ingest",
      data: { payload: [payload] },
    });

    // 9. Clean up temp storage
    attachmentTempStorage.delete(tempId);
    logger.debug(`Cleaned up temp storage entry: ${tempId}`);

    // 10. Reply with success
    await interaction.editReply({
      content: `✅ Text ingestion started!\n**File**: ${attachmentInfo.filename}\n**Type**: ${type}\n**Title**: ${title}\n**Date**: ${finalDate}\n**ID**: \`${docId}\``,
    });
  } catch (error) {
    logger.error(
      `Error in handleTextFileModalSubmit: ${error instanceof Error ? error.message : String(error)}`,
    );

    await interaction.editReply({
      content: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  }
}
