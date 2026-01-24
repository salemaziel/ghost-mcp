# Ghost MCP Server

## Project Overview

**Ghost MCP Server** is a TypeScript-based Model Context Protocol (MCP) server that enables LLMs (like Claude) to interact with a Ghost CMS instance. It utilizes the official `@tryghost/admin-api` to provide secure access to managing posts, members, newsletters, and other Ghost entities.

### Key Technologies
- **Language:** TypeScript (Node.js)
- **Framework:** `@modelcontextprotocol/sdk`
- **Ghost API:** `@tryghost/admin-api`
- **Validation:** `zod`
- **HTTP Client:** `axios`

## Architecture

The project is structured to modularly expose Ghost resources as MCP tools and resources, supporting multiple transport protocols.

- **`src/server.ts`**: The application entry point. It parses CLI args, initializes `express` (if SSE mode) or `StdioServerTransport`, dynamically imports modules, and registers capabilities.
- **`src/ghostApi.ts`**: Handles the initialization and configuration of the Ghost Admin API client.
- **`src/tools/`**: Contains the implementation of MCP tools, grouped by entity type (e.g., `posts.ts`, `members.ts`).
- **`src/resources.ts`**: Defines handlers for MCP resources.
- **`src/prompts.ts`**: Manages MCP prompts.
- **`src/config.ts`**: (Legacy/Internal) Exports configuration constants. Validation is now handled in `server.ts`.

### Transport Modes
- **Stdio**: Default mode for local subprocess integration (e.g., Claude Desktop).
- **SSE (Server-Sent Events)**: HTTP server mode using `express` and `@modelcontextprotocol/sdk/server/sse.js`.

## Building and Running

### Prerequisites
- Node.js (v18+ recommended)
- npm

### Commands

*   **Install Dependencies:**
    ```bash
    npm install
    ```

*   **Build the Project:**
    Compiles TypeScript to JavaScript in the `build/` directory.
    ```bash
    npm run build
    ```

*   **Start (Stdio Mode):**
    ```bash
    npm start
    ```

*   **Start (SSE Mode):**
    ```bash
    npm start -- --transport sse --port 3000
    ```

## Development Workflow

### Configuration
The server supports `.env` files for configuration.
- `GHOST_API_URL`
- `GHOST_ADMIN_API_KEY`
