// src/prompts.ts
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ghostApiClient } from "./ghostApi.js";

export function registerPrompts(server: McpServer) {
  // Existing prompt: summarize-post
  server.prompt(
    "summarize-post",
    { postId: z.string() },
    async ({ postId }) => {
      // Fetch the post by ID
      const post = await ghostApiClient.posts.read({ id: postId });
      const title = post.title || "";
      const excerpt = post.excerpt || "";
      const html = post.html || "";

      // Compose a summary message
      const summary = `Title: ${title}\nExcerpt: ${excerpt}\n\nContent Preview:\n${html.slice(0, 300)}...`;

      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `Summarize the following Ghost post:\n\n${summary}`,
            },
          },
        ],
      };
    }
  );

  // New Prompt: Draft Newsletter
  server.prompt(
    "draft-newsletter",
    { topic: z.string().describe("The main topic or theme of the newsletter") },
    async ({ topic }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
                type: "text",
                text: `I want to write a newsletter about "${topic}".
Please help me draft the content. It should be engaging and formatted in HTML.
After drafting, please ask me if I want to publish it using the 'workflows_publish_newsletter' tool.
If I say yes, help me construct the tool call with a title, the HTML content, and a segment (e.g., 'all', 'free', 'paid').`
            }
          }
        ]
      }
    }
  );

  // New Prompt: Manage Audience
  server.prompt(
      "manage-audience",
      {},
      async () => {
          return {
              messages: [
                  {
                      role: "user",
                      content: {
                          type: "text",
                          text: `I want to manage my Ghost members.
Please help me analyze my audience or perform bulk actions.
You can:
1. Browse members to see who is active/inactive.
2. Use 'workflows_segment_members' to tag specific groups (e.g., tag all free members as 'prospects').
Ask me what kind of segmentation or cleanup I want to do.`
                      }
                  }
              ]
          }
      }
  );
}