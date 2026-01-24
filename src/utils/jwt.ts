import jwt from 'jsonwebtoken';

export class GhostJWTHandler {
    private keyId: string;
    private secret: Buffer;
    private tokenCache: { token: string; expiresAt: number } | null = null;
    private expirationTime: number;

    constructor(adminApiKey: string, expirationTime: number = 3600) {
        const parts = adminApiKey.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid Ghost Admin API Key format. Expected "id:secret".');
        }
        this.keyId = parts[0];
        // Decode the hexadecimal secret into a buffer
        this.secret = Buffer.from(parts[1], 'hex');
        this.expirationTime = expirationTime;
    }

    /**
     * Generates a valid JWT token for Ghost Admin API authentication.
     * Caches the token to reuse it until it's close to expiration.
     */
    public getToken(): string {
        const now = Math.floor(Date.now() / 1000);

        // Reuse cached token if it has at least 1 minute of validity left
        if (this.tokenCache && this.tokenCache.expiresAt > now + 60) {
            return this.tokenCache.token;
        }

        const expiresAt = now + this.expirationTime;

        const payload = {
            iat: now,
            exp: expiresAt,
            aud: '/admin/',
        };

        const token = jwt.sign(payload, this.secret, {
            algorithm: 'HS256',
            keyid: this.keyId,
        });

        this.tokenCache = {
            token,
            expiresAt,
        };

        return token;
    }
}
