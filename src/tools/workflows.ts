import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { publishNewsletter } from "../workflows/newsletter.js";
import { segmentMembers } from "../workflows/members.js";

export function registerWorkflowTools(server: McpServer) {
    // Workflow: Publish Newsletter
    server.tool(
        "workflows_publish_newsletter",
        "Workflow to create and publish a newsletter.",
        {
            title: z.string().describe("The title of the newsletter/post"),
            html: z.string().describe("The full HTML content of the newsletter"),
            segment: z.string().optional().describe("Recipient segment: 'all', 'free', 'paid', or a custom filter string. Defaults to 'all'."),
            schedule_at: z.string().optional().describe("ISO 8601 date string to schedule the post. If omitted, publishes immediately."),
            tags: z.array(z.string()).optional().describe("Tags to apply to the post"),
            newsletter_id: z.string().optional().describe("Specific newsletter ID. If omitted, uses the default active newsletter.")
        },
        async (args, _extra) => {
            try {
                const result = await publishNewsletter(args);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Workflow failed: ${error.message}`
                        }
                    ]
                };
            }
        }
    );

    // Workflow: Segment Members
    server.tool(
        "workflows_segment_members",
        "Workflow to tag/untag members based on filters.",
        {
            filter: z.string().describe("Ghost member filter string (e.g., 'status:free', 'created_at:<2023-01-01')"),
            add_tag: z.string().optional().describe("Tag to add to matching members"),
            remove_tag: z.string().optional().describe("Tag to remove from matching members"),
            limit: z.number().optional().describe("Max members to process (safety limit). Default 50.")
        },
        async (args, _extra) => {
            try {
                const result = await segmentMembers(args);
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify(result, null, 2)
                        }
                    ]
                };
            } catch (error: any) {
                return {
                    isError: true,
                    content: [
                        {
                            type: "text",
                            text: `Workflow failed: ${error.message}`
                        }
                    ]
                };
            }
        }
    );
}
