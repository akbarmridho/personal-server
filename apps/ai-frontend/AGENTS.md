# AI Frontend - Investment Knowledge Viewer

Frontend application for displaying investment documents from knowledge-service with timeline and human-friendly views.

## Technology Stack

- **Runtime**: Node.js >=24
- **Language**: TypeScript
- **Framework**: React Router v7 (SSR-capable)
- **Build Tool**: Vite 7
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS v4
- **Code Quality**: Biome (linting + formatting)

## Project Structure

```
apps/ai-frontend/
├── app/                    # React Router app directory
│   ├── routes/            # File-based routing
│   ├── components/        # Reusable UI components
│   │   └── ui/           # shadcn/ui components
│   ├── lib/              # Utilities (cn function, etc.)
│   ├── root.tsx          # Root layout with providers
│   └── app.css           # Global styles
├── public/                # Static assets
├── biome.json            # Biome configuration (extends root)
├── tsconfig.json         # TypeScript config (extends ../../tsconfig.base.json)
├── vite.config.ts        # Vite configuration
└── react-router.config.ts # React Router configuration
```

## Features

### Views

1. **Timeline View**
   - Chronological display of investment documents
   - Grouped by date/time periods
   - Visual timeline navigation

2. **Human View**
   - Reader-friendly document display
   - Optimized for readability
   - Metadata visualization

### Filters

- **Document Type**: news, filing, analysis, rumour
- **Symbols**: Stock ticker filtering (BBCA, TLKM, etc.)
- **Subsectors**: Broad categories (financials, infrastructure, energy)
- **Subindustries**: Specific industries (banks, toll_roads, coal_mining)
- **Indices**: Market indices (IHSG, LQ45, IDX30)
- **Date Range**: Temporal filtering with ISO 8601 support

## Scripts

- `pnpm build` - Production build with React Router
- `pnpm dev` - Development server with HMR (default: <http://localhost:5173>)
- `pnpm start` - Start production server
- `pnpm typecheck` - Run TypeScript type checking with react-router typegen

## Code Quality

### Biome Configuration

This project uses Biome for fast linting and formatting. Configuration extends from root `biome.json`:

```json
{
  "extends": ["../../biome.json"],
  "files": {
    "ignore": ["build/", ".react-router/"]
  }
}
```

### Biome Commands

```bash
# Check code
npx @biomejs/biome check .

# Apply auto-fixes
npx @biomejs/biome check --write .

# Format code
npx @biomejs/biome format --write .

# Lint only
npx @biomejs/biome lint .
```

## TypeScript Configuration

Extends the repository base configuration at `../../tsconfig.base.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    // React Router/SSR-specific overrides
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "lib": ["DOM", "DOM.Iterable", "ES2022"]
  }
}
```

## API Integration

### Knowledge Service Endpoints

The application connects to knowledge-service for:

- **GET /documents** - List documents with filters
- **GET /documents/{id}** - Get single document
- **GET /search** - Semantic search

### Request/Response Format

See @apps/knowledge-service/README.md for complete API schema.

## shadcn/ui Integration

UI components are managed via shadcn/ui CLI:

```bash
# Add a new component
npx shadcn@latest add [component-name]
```

Components are stored in `app/components/ui/` and configured via `components.json`.

## Deployment

### Docker

```bash
# Build image
docker build -t ai-frontend .

# Run container
docker run -p 3000:3000 ai-frontend
```

### Production Build Output

```
build/
├── client/    # Static assets (CSS, JS, images)
└── server/    # Server-side code for SSR
```

## Port Allocation

- Port **3000** - Default production server (configurable)
- Port **5173** - Development server (Vite default)

See @../../README.md for full port list.

## References

- [React Router Documentation](https://reactrouter.com/)
- [Biome Documentation](https://biomejs.dev/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/)
