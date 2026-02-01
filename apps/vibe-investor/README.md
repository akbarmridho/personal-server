# Vibe Investor - OpenCode Infrastructure as Code

Infrastructure-as-code setup for OpenCode AI agents with custom configurations, EJS templating, and isolated environments.

## Features

- 🤖 **Multiple Agents**: Define agents in `opencode.json`
- 🔧 **Config Resolution**: Resolves `{env:...}` and `{file:...}` placeholders at runtime
- 📝 **EJS Templating**: Use EJS includes in markdown prompts
- 🌐 **Dual Entry Points**: CLI (TUI) and Web interfaces
- 🔐 **Isolated Environment**: Standalone config, doesn't interfere with global OpenCode
- 🎯 **Custom CWD**: Run OpenCode in any working directory
- 🛠️ **Custom Tools**: Load project-specific tools/agents from `.opencode/` even in different CWD
- 🚀 **OpenRouter Integration**: Use OpenRouter for access to multiple LLM providers

## Directory Structure

```
apps/vibe-investor/
├── .env                      # Environment variables
├── .env.example              # Environment template
├── .gitignore
├── README.md
├── package.json              # TypeScript + EJS dependencies
├── tsconfig.json
├── opencode.json             # Config with {env:...} and {file:...} placeholders
├── bin/
│   ├── cli.sh                # CLI entrypoint (resolves config, execs opencode)
│   └── web.sh                # Web entrypoint (resolves config, execs opencode web)
├── src/
│   ├── config-resolver.ts    # Core library for resolving placeholders
│   └── resolve-config.ts     # CLI tool that outputs resolved JSON
├── .opencode/                # Project-specific OpenCode configuration
│   ├── tools/                # Custom tools
│   ├── agents/               # Custom agents
│   ├── commands/             # Custom commands
│   ├── skills/               # Custom skills
│   └── plugins/              # Custom plugins
└── prompts/
    └── technical-analyst/
        ├── main.md           # Main prompt with EJS includes
        ├── requirements.txt  # Python dependencies for the agent
        └── modules/          # Included markdown modules
```

## Prerequisites

1. **OpenCode CLI** installed globally:
   ```bash
   pnpm install -g opencode-ai
   ```

2. **OpenRouter API key** from [openrouter.ai](https://openrouter.ai/)

3. **Python 3.8+** with pip (required for technical-analyst agent)

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Install Python Dependencies

Install Python packages required by the technical-analyst agent:

```bash
pip install -r prompts/technical-analyst/requirements.txt
```

**Dependencies:**
- `pandas`, `scipy`, `numpy` - Data analysis and math
- `mplfinance` - Static charting for internal analysis
- `lightweight-charts` - Interactive TradingView-style charts

### 3. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenRouter API key:

```bash
OPENROUTER_API_KEY=your_api_key_here
OPENCODE_CWD=/path/to/your/project  # Optional: custom working directory
```

## Usage

### CLI (Terminal UI)

```bash
./bin/cli.sh
# or
pnpm cli
```

### Web Interface

```bash
./bin/web.sh
# or
pnpm web
```

### Pass Arguments

Both scripts accept OpenCode CLI arguments:

```bash
pnpm cli --continue
pnpm cli --model gpt-5.2
pnpm web --port 8080
```

## How It Works

### 1. Config Resolution

The TypeScript resolver (`src/config-resolver.ts`) processes `opencode.json`:

**Before (opencode.json):**
```json
{
  "provider": {
    "openrouter": {
      "options": {
        "apiKey": "{env:OPENROUTER_API_KEY}"
      }
    }
  },
  "agent": {
    "technical-analyst": {
      "prompt": "{file:./prompts/technical-analyst/main.md}"
    }
  }
}
```

**After resolution:**
```json
{
  "provider": {
    "openrouter": {
      "options": {
        "apiKey": "sk-or-v1-actual-key-here"
      }
    }
  },
  "agent": {
    "technical-analyst": {
      "prompt": "# Technical Analyst\n\n[Full resolved content with includes]..."
    }
  }
}
```

### 2. EJS Template Processing

**Prompt with includes (`main.md`):**
```markdown
# Technical Analyst AI Agent

<%- include('modules/01-structure.md') %>
<%- include('modules/02-levels.md') %>
```

**Resolved:**
```markdown
# Technical Analyst AI Agent

[Content from 01-structure.md]

[Content from 02-levels.md]
```

### 3. Execution Flow

**Bash scripts are the real entrypoint**, TypeScript only resolves the config:

```bash
# 1. Bash script calls TypeScript resolver
RESOLVED_CONFIG=$(pnpm tsx src/resolve-config.ts)

# 2. Export resolved config as environment variable
export OPENCODE_CONFIG_CONTENT="$RESOLVED_CONFIG"

# 3. Change to work directory and exec opencode (replaces bash process)
cd "$WORK_DIR"
exec opencode "$@"
```

This design means:
- **TypeScript role**: Only config resolution (env vars + EJS includes)
- **Bash role**: Real entrypoint, launches OpenCode CLI
- **You get full CLI control**: Since bash uses `exec`, you interact directly with OpenCode
- **No intermediate process**: Bash is replaced by OpenCode, not wrapping it

## Configuration

### Placeholders

**`{env:VAR_NAME}`** - Replaced with environment variable:
```json
{
  "apiKey": "{env:OPENROUTER_API_KEY}"
}
```

**`{file:path/to/file}`** - Replaced with file content (with EJS processing):
```json
{
  "prompt": "{file:./prompts/technical-analyst/main.md}"
}
```

### EJS Includes in Markdown

Use `<%- include('path') %>` in your markdown files:

```markdown
# Main Prompt

<%- include('modules/01-structure.md') %>
<%- include('modules/02-levels.md') %>
```

**Features:**
- ✅ Relative paths (relative to the markdown file)
- ✅ Nested includes (included files can include others)
- ✅ Works with any text format

### Custom Tools and Config

The `.opencode/` directory contains project-specific configuration that's loaded **even when OpenCode runs in a different CWD**.

**How it works:**
- Bash scripts set `OPENCODE_CONFIG_DIR` to point to vibe-investor's `.opencode/` directory
- OpenCode loads custom tools, agents, commands, skills, and plugins from this directory
- **No symlinks or cleanup needed** - just an environment variable

**Directory structure:**
```
.opencode/
├── tools/       # Custom tools (TypeScript/JavaScript)
├── agents/      # Custom agents (Markdown)
├── commands/    # Custom commands (Markdown)
├── skills/      # Custom skills (SKILL.md)
└── plugins/     # Custom plugins (TypeScript/JavaScript)
```

**Available custom tools:**

1. **`fetch-ohlcv`** - Fetch 3 years of OHLCV data for Indonesian stocks
   - **Parameters**: `ticker` (e.g., "BBCA"), `output_path` (e.g., "data/BBCA_ohlcv.json")
   - **Purpose**: Downloads historical price data from kb.akbarmr.dev and saves to file
   - **Data**: Daily OHLCV, foreign flow, trading frequency, company metrics
   - **Usage**: Used by technical-analyst agent to fetch data before analysis
   - **Output**: Saves JSON file to specified path (doesn't return content to avoid context explosion)

See `.opencode/README.md` for detailed usage and OpenCode docs for guides.

## Model Aliases

Create friendly aliases in `opencode.json`:

```json
{
  "provider": {
    "openrouter": {
      "models": {
        "gpt-5.2": {
          "id": "openai/gpt-5.2",
          "options": {
            "reasoningEffort": "high"
          }
        },
        "kimi-2.5": {
          "id": "moonshotai/kimi-k2.5"
        }
      }
    }
  }
}
```

Then use: `"model": "gpt-5.2"` or `openrouter/gpt-5.2`

## Environment Variables

### Required

- `OPENROUTER_API_KEY` - Your OpenRouter API key

### Optional

- `OPENCODE_CWD` - Custom working directory (default: current directory)
- `OPENCODE_PORT` - Server port for web interface (default: 4096)
- `OPENCODE_HOSTNAME` - Server hostname (default: 0.0.0.0)

## Development

### Structure

- **`src/config-resolver.ts`**: Core library for resolving placeholders (env vars + EJS)
- **`src/resolve-config.ts`**: CLI tool that outputs resolved JSON to stdout
- **`bin/cli.sh`**: CLI entrypoint (resolves config, execs opencode)
- **`bin/web.sh`**: Web entrypoint (resolves config, execs opencode web)

### Adding New Agents

1. Create prompt in `prompts/your-agent/main.md`
2. Add agent to `opencode.json`:
   ```json
   {
     "agent": {
       "your-agent": {
         "description": "...",
         "prompt": "{file:./prompts/your-agent/main.md}"
       }
     }
   }
   ```
3. Use with `/agent your-agent` or set as `default_agent`

## Troubleshooting

### "opencode: command not found"

```bash
pnpm install -g opencode-ai
```

### "OPENROUTER_API_KEY not set"

Check your `.env` file exists and has the API key set.

### TypeScript errors

```bash
pnpm install  # Install dependencies
```

### EJS include not found

Make sure:
- Paths are relative to the markdown file (not the project root)
- File extensions are included: `include('file.md')` not `include('file')`

## References

- [OpenCode Documentation](https://opencode.ai/docs)
- [EJS Documentation](https://ejs.co/)
- [OpenRouter](https://openrouter.ai/)

## License

See repository root for license information.
