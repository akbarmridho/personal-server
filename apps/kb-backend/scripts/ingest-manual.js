const fs = require("fs/promises");
const path = require("path");
const { execSync } = require("child_process");

// --- DYNAMIC INSTALLER START ---
function requireWithInstall(moduleName) {
  try {
    return require(moduleName);
  } catch (e) {
    if (e.code === "MODULE_NOT_FOUND") {
      console.log(`📦 Installing '${moduleName}' dynamically...`);
      // --no-save prevents adding to package.json
      // --no-package-lock prevents creating package-lock.json
      execSync(`npm install ${moduleName} --no-save --no-package-lock`, {
        stdio: "inherit",
      });
      console.log(`✅ Installed '${moduleName}'. Resuming script...\n`);
      return require(moduleName);
    }
    throw e;
  }
}

// Load gray-matter dynamically
const matter = requireWithInstall("gray-matter");
// --- DYNAMIC INSTALLER END ---

// CONFIGURATION
const INPUT_DIR = "./input";
const ENDPOINT = "https://inngest.akbarmr.dev/e/736563726574";

// Validation Logic
function validateMetadata(fileName, data) {
  const errors = [];

  // Check basic fields
  const requiredFields = ["title", "date", "type"];
  requiredFields.forEach((field) => {
    if (!data[field]) errors.push(`Missing field: '${field}'`);
  });

  // Check Source Object structure
  if (!data.source) {
    errors.push("Missing field: 'source' object");
  } else {
    if (!data.source.name) errors.push("Missing inside source: 'source.name'");
    if (!data.source.url) errors.push("Missing inside source: 'source.url'");
  }

  if (errors.length > 0) {
    throw new Error(
      `Invalid Metadata in '${fileName}':\n - ${errors.join("\n - ")}`,
    );
  }

  return true;
}

async function main() {
  try {
    // Ensure input directory exists
    try {
      await fs.access(INPUT_DIR);
    } catch {
      console.error(`❌ Error: Input directory '${INPUT_DIR}' does not exist.`);
      return;
    }

    const files = await fs.readdir(INPUT_DIR);
    const markdownFiles = files.filter(
      (file) => file.endsWith(".md") && file !== "TEMPLATE.md",
    );

    if (markdownFiles.length === 0) {
      console.log("No markdown files found in input directory.");
      return;
    }

    console.log(`Found ${markdownFiles.length} files. Processing...`);

    const payload = [];

    for (const file of markdownFiles) {
      const filePath = path.join(INPUT_DIR, file);
      const fileContent = await fs.readFile(filePath, "utf-8");

      const { data, content } = matter(fileContent);

      // Validation
      try {
        validateMetadata(file, data);
      } catch (validationError) {
        console.error(`\n❌ SKIPPING ${file}`);
        console.error(validationError.message);
        continue;
      }

      // Construct ID
      const docId =
        data.id || file.replace(".md", "").toLowerCase().replace(/\s+/g, "-");

      payload.push({
        id: docId,
        title: data.title,
        content: content.trim(),
        document_date: data.date,
        type: data.type,
        source: data.source,
        urls: data.urls || [],
      });

      console.log(`✅ Ready: ${data.title}`);
    }

    if (payload.length === 0) return;

    console.log(`\nSending ${payload.length} documents...`);

    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "data/document-manual-ingest",
        data: { payload },
        user: {},
      }),
    });

    const responseData = await response.json();
    console.log("Response:", JSON.stringify(responseData, null, 2));
  } catch (error) {
    console.error("Fatal Error:", error);
  }
}

main();
