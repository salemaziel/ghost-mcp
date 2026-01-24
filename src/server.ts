import 'dotenv/config'; // Load .env file before anything else
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";

/**
 * Creates and initializes the MCP server.
 * This function is required by smithery.ai for deployment.
 */
export async function createServer() {
    // validate environment variables
    if (!process.env.GHOST_API_URL || !process.env.GHOST_ADMIN_API_KEY) {
        console.error("\x1b[31mError: Missing Ghost CMS configuration.\x1b[0m");
        console.error("Please set the following environment variables:");
        console.error("  - GHOST_API_URL: The URL of your Ghost blog (e.g., https://yourblog.com)");
        console.error("  - GHOST_ADMIN_API_KEY: Your Ghost Admin API Key");
        console.error("\nYou can set these in a .env file in the current directory.");
        throw new Error("Missing Ghost CMS configuration");
    }

    // Dynamic imports to ensure config is loaded/validated first
    const {
        handleUserResource,
        handleMemberResource,
        handleTierResource,
        handleOfferResource,
        handleNewsletterResource,
        handlePostResource,
        handleBlogInfoResource
    } = await import('./resources.js');

    // Create an MCP server instance
    const server = new McpServer({
        name: "ghost-mcp-ts",
        version: "1.0.0",
        capabilities: {
            resources: {},
            tools: {},
            prompts: {},
            logging: {}
        }
    });

    // Register resource handlers
    server.resource("user", new ResourceTemplate("user://{user_id}", { list: undefined }), handleUserResource);
    server.resource("member", new ResourceTemplate("member://{member_id}", { list: undefined }), handleMemberResource);
    server.resource("tier", new ResourceTemplate("tier://{tier_id}", { list: undefined }), handleTierResource);
    server.resource("offer", new ResourceTemplate("offer://{offer_id}", { list: undefined }), handleOfferResource);
    server.resource("newsletter", new ResourceTemplate("newsletter://{newsletter_id}", { list: undefined }), handleNewsletterResource);
    server.resource("post", new ResourceTemplate("post://{post_id}", { list: undefined }), handlePostResource);
    server.resource("blog-info", "blog://info", handleBlogInfoResource);

    // Register tools
    const { registerPostTools } = await import("./tools/posts.js");
    registerPostTools(server);
    const { registerMemberTools } = await import("./tools/members.js");
    registerMemberTools(server);
    const { registerUserTools } = await import("./tools/users.js");
    registerUserTools(server);
    const { registerTagTools } = await import("./tools/tags.js");
    registerTagTools(server);
    const { registerTierTools } = await import("./tools/tiers.js");
    registerTierTools(server);
    const { registerOfferTools } = await import("./tools/offers.js");
    registerOfferTools(server);
    const { registerNewsletterTools } = await import("./tools/newsletters.js");
    registerNewsletterTools(server);
    const { registerInviteTools } = await import("./tools/invites.js");
    registerInviteTools(server);
    const { registerRoleTools } = await import("./tools/roles.js");
    registerRoleTools(server);
    const { registerWebhookTools } = await import("./tools/webhooks.js");
    registerWebhookTools(server);

    const { registerWorkflowTools } = await import("./tools/workflows.js");
    registerWorkflowTools(server);

    const { registerPrompts } = await import("./prompts.js");
    registerPrompts(server);

    return server;
}

async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const getArgValue = (flag: string) => {
        const index = args.indexOf(flag);
        return index >= 0 ? args[index + 1] : undefined;
    };
    const transportArg = getArgValue('--transport');
    const portArg = getArgValue('--port');
    const transportType = transportArg ?? (portArg ? 'streamable' : 'stdio');
    const port = portArg ? parseInt(portArg, 10) : 3000;

    const server = await createServer();

    // Handle transports
    if (transportType === 'streamable') {
        const app = express();

        // Use CORS to allow requests from any origin (configure as needed for production)
        app.use(cors());
        app.use(express.json());

        const transports = new Map<string, StreamableHTTPServerTransport>();

        app.post("/mcp", async (req: any, res: any) => {
            try {
                const sessionHeader = req.headers["mcp-session-id"];
                const sessionId = Array.isArray(sessionHeader) ? sessionHeader[0] : sessionHeader;
                let transport = sessionId ? transports.get(sessionId) : undefined;

                if (!transport) {
                    if (!isInitializeRequest(req.body)) {
                        res.status(400).json({
                            jsonrpc: "2.0",
                            error: {
                                code: -32000,
                                message: "Bad Request: missing or invalid session ID",
                            },
                            id: null,
                        });
                        return;
                    }

                    transport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: () => randomUUID(),
                        onsessioninitialized: (newSessionId) => {
                            transports.set(newSessionId, transport!);
                        },
                    });

                    transport.onclose = () => {
                        if (transport?.sessionId) {
                            transports.delete(transport.sessionId);
                        }
                    };

                    await server.connect(transport);
                }

                await transport.handleRequest(req, res, req.body);
            } catch (error) {
                console.error("Error handling MCP streamable request:", error);
                if (!res.headersSent) {
                    res.status(500).json({
                        jsonrpc: "2.0",
                        error: {
                            code: -32603,
                            message: "Internal server error",
                        },
                        id: null,
                    });
                }
            }
        });

        app.listen(port, () => {
            console.error(`Ghost MCP Server running on streamable HTTP at http://localhost:${port}/mcp`);
            console.error(`Use 'http://localhost:${port}/mcp' as the Server URL in your MCP Client`);
        });
    } else if (transportType === 'sse') {
        const app = express();
        
        // Use CORS to allow requests from any origin (configure as needed for production)
        app.use(cors());
        app.use(express.json());

        let transport: SSEServerTransport;

        app.get("/sse", async (req: any, res: any) => {
            console.error(`New SSE connection`);
            transport = new SSEServerTransport("/sse", res);
            await server.connect(transport);
            
            // Handle connection close
            res.on("close", () => {
                console.error("SSE connection closed");
                // Do not close the MCP server, allowing for reconnections
                // server.close(); 
            });
        });

        app.post("/sse", async (req: any, res: any) => {
            if (!transport) {
                res.status(400).send("No active connection");
                return;
            }
            await transport.handlePostMessage(req, res);
        });

        app.listen(port, () => {
            console.error(`Ghost MCP Server running on SSE at http://localhost:${port}/sse`);
            console.error(`Use 'http://localhost:${port}/sse' as the Server URL in your MCP Client`);
        });

    } else {
        // Default to Stdio
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Ghost MCP TypeScript Server running on stdio");
    }
}

// Start the server if it's the main module
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith('server.js')) {
    main().catch((error: any) => {
        console.error("Fatal error starting server:", error);
        process.exit(1);
    });
}
