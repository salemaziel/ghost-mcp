import { GhostClient } from './utils/ghost-client.js';
import { GHOST_API_URL, GHOST_ADMIN_API_KEY, GHOST_API_VERSION, GHOST_TOKEN_EXPIRATION } from './config.js';

// Initialize and export the Ghost Admin API client instance.
// Configuration is loaded from src/config.ts.
export const ghostApiClient = new GhostClient({
    url: GHOST_API_URL,
    key: GHOST_ADMIN_API_KEY,
    version: GHOST_API_VERSION,
    tokenExpiration: GHOST_TOKEN_EXPIRATION
});


// You can add helper functions here to wrap API calls and handle errors
// For example:
/*
export async function getPostById(postId: string): Promise<any> {
    try {
        const post = await ghostApiClient.posts.read({ id: postId });
        return post;
    } catch (error) {
        console.error(`Error fetching post ${postId}:`, error);
        throw new Error(`Failed to fetch post ${postId}`);
    }
}
*/
