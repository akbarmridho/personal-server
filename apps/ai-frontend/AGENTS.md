# AI Frontend - Investment Knowledge Viewer

Frontend application for displaying investment documents from knowledge-service with timeline and human-friendly views.

## Technology Stack

- **Runtime**: Node.js >=24
- **Language**: TypeScript (strict mode)
- **Framework**: React Router v7 (SSR-capable)
- **Build Tool**: Vite 7
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Styling**: Tailwind CSS v4 (OKLCH color system, dark mode support)
- **Code Quality**: Biome (linting + formatting)

### Dependencies

**Core Libraries:**

- `@tanstack/react-query` v5 - Data fetching, caching, infinite queries
- `dayjs` - Date manipulation with timezone support (Asia/Jakarta)
- `react-markdown` - Markdown rendering
- `remark-gfm` - GitHub Flavored Markdown support

**UI Components:**

- `card`, `badge`, `calendar`, `popover`, `checkbox`, `separator`
- `skeleton`, `scroll-area`, `sheet`, `command`, `input`

**State Management:**

- URL search params (filter state via React Router)
- React Query (server state)
- React hooks + localStorage (dark mode theme)

## Project Structure

```
apps/ai-frontend/
├── app/
│   ├── routes/
│   │   ├── home.tsx                     # Index route
│   │   ├── timeline.ticker.tsx          # Ticker timeline page
│   │   ├── timeline.general.tsx         # Non-symbol timeline page
│   │   └── _layout.timeline.tsx         # Shared timeline layout
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts                # Base fetch wrapper
│   │   │   ├── knowledge.ts             # Knowledge service API
│   │   │   ├── stock-universe.ts        # Stock universe API
│   │   │   └── types.ts                 # Shared API types
│   │   ├── utils/
│   │   │   ├── cn.ts                    # className utility
│   │   │   ├── date.ts                  # Dayjs timezone utilities
│   │   │   └── url-params.ts            # URL serialization
│   │   └── constants/
│   │       ├── filters.ts               # Filter presets/options
│   │       └── query-keys.ts            # React Query key factory
│   │
│   ├── components/
│   │   ├── timeline/
│   │   │   ├── timeline-container.tsx   # Main timeline with infinite scroll
│   │   │   ├── timeline-item.tsx        # Expandable card
│   │   │   ├── timeline-skeleton.tsx    # Loading skeleton
│   │   │   └── empty-state.tsx          # No results state
│   │   ├── filters/
│   │   │   ├── filter-bar.tsx           # Filter container
│   │   │   ├── search-filter.tsx        # Search input (debounced)
│   │   │   ├── date-filter.tsx          # Date preset + picker
│   │   │   ├── type-filter.tsx          # Type multi-select
│   │   │   ├── ticker-filter.tsx        # Ticker multi-select
│   │   │   ├── subsector-filter.tsx     # Subsector multi-select
│   │   │   └── filter-badge.tsx         # Active filter chip
│   │   ├── ui/                          # shadcn/ui components
│   │   ├── theme-toggle.tsx             # Dark mode toggle button
│   │   └── markdown-renderer.tsx        # Markdown content renderer
│   │
│   ├── hooks/
│   │   ├── use-timeline-filters.ts      # Filter state from URL
│   │   ├── use-timeline-query.ts        # Infinite/search query
│   │   ├── use-stock-universe.ts        # Stock universe query
│   │   ├── use-theme.ts                 # Dark mode theme hook
│   │   └── use-debounced-value.ts       # Debounce hook for search
│   │
│   ├── types/
│   │   └── timeline.ts                  # Domain types
│   │
│   ├── root.tsx                         # Root layout with providers
│   ├── routes.ts                        # Route configuration
│   └── app.css                          # Global Tailwind styles
│
├── public/                              # Static assets
├── components.json                      # shadcn/ui configuration
├── package.json                         # Dependencies
├── react-router.config.ts               # React Router SSR config
├── vite.config.ts                       # Vite configuration
└── tsconfig.json                        # TypeScript config
```

## Features

### Timeline View

Two specialized timeline pages for browsing investment documents:

1. **Ticker Timeline** (`/timeline/ticker`)
   - Shows documents WITH stock symbols (ticker-specific news)
   - Filters: Date, Type, Ticker (multi-select), Search
   - Infinite scroll pagination
   - Preset ticker filters from stock universe

2. **General Timeline** (`/timeline/general`)
   - Shows documents WITHOUT stock symbols (macro/general market news)
   - Filters: Date, Type, Subsector (optional multi-select), Search
   - By default shows ALL non-symbol documents
   - Uses `pure_sector=true` API filter

### Timeline Features

**Core Functionality:**

- Expandable cards (collapsed shows preview, expanded shows full markdown content)
- Infinite scroll pagination (list mode)
- Semantic search with debounced input (search mode)
- Shareable URLs (filters + search encoded in URL params)
- Dates displayed in Asia/Jakarta timezone (GMT+7)
- Dark mode toggle with localStorage persistence
- Mobile-responsive design

**Filter System:**

- **Search**: Full-text semantic search (debounced 300ms)
- **Date**: Preset ranges (Today, Last 7/30 days) + Custom date range picker
- **Type**: Multi-select (news, filing, rumour, analysis)
- **Ticker**: Multi-select combobox with stock universe preset
- **Subsector**: Optional multi-select (general timeline only)

**Entry Display:**

- Metadata badges (symbols, source, document date)
- Markdown rendering with syntax highlighting
- Clickable URLs (open in new tab)
- Source attribution

### Smart Mode Switching

The timeline intelligently switches between two query modes:

**List Mode** (No Search Query):

- Uses `GET /knowledge/documents` endpoint
- Cursor-based pagination with `next_page_offset`
- Infinite scroll enabled
- Returns document snapshots (100 token preview)
- Efficient for browsing large datasets

**Search Mode** (Search Query Present):

- Uses `POST /knowledge/documents/search` endpoint
- Returns full documents with similarity scores
- No pagination (all results up to limit)
- Filters still apply (date, type, symbols, subsectors)
- Search is debounced (300ms)

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

### KB-Backend Proxy

The application connects to kb-backend which proxies knowledge-service endpoints:

**Base URL**: `http://localhost:{HTTP_SERVER_PORT}`

### Knowledge Endpoints

1. **List Documents**: `GET /knowledge/documents`
   - Query params: `limit`, `offset`, `symbols`, `subsectors`, `types`, `date_from`, `date_to`, `pure_sector`
   - Response: `{ success: true, data: { items: DocumentSnapshot[], next_page_offset?: string } }`
   - Used in List Mode (no search query)

2. **Search Documents**: `POST /knowledge/documents/search`
   - Body: `{ query: string, limit?, symbols?, subsectors?, types?, date_from?, date_to?, pure_sector? }`
   - Response: `{ success: true, data: SearchResult[] }` (includes similarity scores)
   - Used in Search Mode (when search query provided)

3. **Get Document**: `GET /knowledge/documents/:id`
   - Response: `{ success: true, data: InvestmentDocument }`
   - Used to fetch full document details

4. **Stock Universe**: `GET /stock-market-id/stock-universe/list`
   - Response: `{ success: true, symbols: string[], count: number }`
   - Used for ticker filter presets

### Document Schema

```typescript
interface InvestmentDocument {
  id: string;                    // UUID v4
  type: "news" | "filing" | "analysis" | "rumour";
  title?: string;
  content: string;               // Markdown content
  document_date: string;         // ISO 8601: "2025-01-15" or "2025-01-15T14:30:00+07:00"
  source: Record<string, string>; // e.g., {"platform": "stockbit", "type": "news"}
  urls?: string[];
  symbols?: string[];            // ["BBCA", "TLKM"]
  subsectors?: string[];         // ["financials", "energy"]
  subindustries?: string[];      // ["banks", "coal_mining"]
  indices?: string[];            // ["IHSG", "LQ45"]
}
```

See @apps/knowledge-service/README.md for complete schema documentation.

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

- Port **8023** - Production server (AI Frontend)
- Port **5173** - Development server (Vite default)

See @../../README.md for full port list.

## Architecture Patterns

### Data Flow

**Filter State Flow:**

```
User Interaction → Filter Component → useTimelineFilters() hook →
React Router setSearchParams() → URL Updated → Route Re-renders →
useTimelineQuery() detects change → React Query refetches → Timeline updates
```

**Infinite Scroll:**

```
User scrolls to bottom → Intersection Observer → fetchNextPage() →
API request with next_page_offset → React Query appends page → Render new items
```

**Search Flow:**

```
User types → Debounce (300ms) → useTimelineFilters() → URL Updated →
useTimelineQuery() switches to Search Mode → POST /documents/search →
Results displayed (no pagination)
```

### Component Communication

- **Props down**: Parent components pass data to children
- **URL params up**: Filter changes update URL via React Router
- **React Query**: Manages all server state (documents, stock universe)
- **localStorage**: Persists dark mode theme preference

### Performance Optimizations

- React Query caching (5min stale, 10min gc)
- Debounced search input (300ms)
- Cursor-based pagination (efficient for large datasets)
- React.memo for timeline items (prevent unnecessary re-renders)
- Intersection Observer for infinite scroll (no scroll event listeners)

## References

- [React Router Documentation](https://reactrouter.com/)
- [Biome Documentation](https://biomejs.dev/)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Tailwind CSS v4 Documentation](https://tailwindcss.com/)
