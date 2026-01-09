# Filen - Network Drive & WebDAV Integration

Custom integration for Filen cloud storage providing network drive mounting and WebDAV server capabilities.

## Technology Stack

- **Runtime**: Node.js >=24
- **Language**: TypeScript (ESM modules)
- **Process Manager**: PM2
- **Libraries**:
  - `@filen/network-drive` - Network drive mounting
  - `@filen/sdk` - Filen SDK
  - `@filen/sync` - File synchronization
  - `@filen/webdav` - WebDAV server
  - `@dotenvx/dotenvx` - Environment variable management
  - `totp-generator` - TOTP 2FA support

## Requirements

### System Dependencies

- FUSE3 (libfuse2) must be installed on the system

  ```bash
  sudo apt install libfuse2
  ```

## Scripts

- `pnpm build` - Compile TypeScript to JavaScript
- `pnpm format` - Format code with Biome
- `pnpm lint` - Lint code with Biome
- `pnpm check` - Check code with Biome
- `pnpm check:apply` - Apply Biome fixes
- `pnpm ts-run` - Run TypeScript files with SWC
- `pnpm run` - Start with PM2 using ecosystem.config.js

## Configuration

Environment variables are managed via `.env` file (see project for structure).

## Port Allocation

- Port **4001** - WebDAV Server

See @../../README.md for full port list.
