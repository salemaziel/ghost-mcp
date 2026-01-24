// Read configuration values directly from process.env
export const GHOST_API_URL: string = process.env.GHOST_API_URL as string;
export const GHOST_ADMIN_API_KEY: string = process.env.GHOST_ADMIN_API_KEY as string;
export const GHOST_API_VERSION: string = process.env.GHOST_API_VERSION as string || 'v5.0'; // Default to v5.0
export const GHOST_TOKEN_EXPIRATION: number = parseInt(process.env.GHOST_TOKEN_EXPIRATION || '3600', 10); // Default to 1 hour