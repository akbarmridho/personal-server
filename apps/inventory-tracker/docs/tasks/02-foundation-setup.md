# Task 2: Foundation Setup - Core Infrastructure

## Objective

Set up the foundational infrastructure including shadcn/ui components, routing, and core utilities.

## Requirements

### shadcn/ui Components Setup

Install and configure required shadcn/ui components:

- Button, Input, Select, Table, Dialog, Form, Card, Badge, Alert, Tabs
- Chart components for Recharts integration
- Set up Tailwind configuration for mobile responsiveness
- Configure Indonesian language support

### TanStack Router Configuration

Set up routing structure for 4 main sections:

- Root layout with sidebar navigation (`src/routes/__root.tsx`)
- Analytics Dashboard route (`src/routes/index.tsx`)
- Category Management route (`src/routes/categories.tsx`)
- Product Management route (`src/routes/products.tsx`)
- Activity History route (`src/routes/activities.tsx`)

### Core Utilities Implementation

Create essential utility files:

- `src/lib/utils.ts` - General utility functions
- `src/lib/constants.ts` - Application constants
- `src/lib/date-utils.ts` - Asia/Jakarta timezone date utilities
- `src/contexts/ThemeContext.tsx` - Theme management

### TypeScript Configuration

Ensure proper TypeScript setup:

- Strict mode configuration
- Path aliases for clean imports
- Type checking for all components

### Project Structure

Organize the project structure as specified:

- Components directory with ui/, forms/, charts/, layout/ subdirectories
- Hooks directory for custom React hooks
- Proper file organization for scalability

## Deliverables

- Configured shadcn/ui components
- Working TanStack Router with all routes
- Core utility functions and constants
- Theme context provider
- Proper TypeScript configuration

## Success Criteria

- All routes accessible and working
- shadcn/ui components properly styled
- Date utilities handle Asia/Jakarta timezone correctly
- Project structure follows the planned architecture
