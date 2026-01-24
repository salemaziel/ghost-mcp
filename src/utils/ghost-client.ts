import axios from 'axios';
import { GhostJWTHandler } from './jwt.js';

// Define a type alias for the Axios instance based on the create function
type AxiosInstance = ReturnType<typeof axios.create>;

interface GhostResourceOptions {
    source?: string;
}

class GhostResource {
    constructor(
        private client: AxiosInstance,
        private resourceName: string
    ) {}
// ... rest of the file


    async browse(params: any = {}) {
        const response = await this.client.get(`/${this.resourceName}/`, { params });
        const data = response.data as any;
        const result = data[this.resourceName] || data;
        if (Array.isArray(result) && data.meta) {
            (result as any).meta = data.meta;
        }
        return result;
    }

    async read(args: { id?: string; slug?: string; email?: string }, params: any = {}) {
        let identifier = '';
        if (args.id) {
            identifier = args.id;
        } else if (args.slug) {
            identifier = `slug/${args.slug}`;
        } else if (args.email) {
             identifier = `email/${args.email}`;
        } else {
            throw new Error(`Read ${this.resourceName} requires id, slug, or email`);
        }

        const response = await this.client.get(`/${this.resourceName}/${identifier}/`, { params });
        // Ghost returns { posts: [...] } even for single read usually, or just the object
        const data = (response.data as any)[this.resourceName];
        return data && data.length ? data[0] : data;
    }

    async add(data: any, options?: GhostResourceOptions) {
        const payload = {
            [this.resourceName]: [data]
        };
        const params = options || {};
        const response = await this.client.post(`/${this.resourceName}/`, payload, { params });
        const resData = (response.data as any)[this.resourceName];
        return resData && resData.length ? resData[0] : resData;
    }

    async edit(args: { id: string } & any, options?: GhostResourceOptions) {
        const { id, ...data } = args;
        const payload = {
            [this.resourceName]: [data]
        };
        const params = options || {};
        const response = await this.client.put(`/${this.resourceName}/${id}/`, payload, { params });
        const resData = (response.data as any)[this.resourceName];
        return resData && resData.length ? resData[0] : resData;
    }

    async delete(args: { id: string }) {
        await this.client.delete(`/${this.resourceName}/${args.id}/`);
        return true;
    }
}

export class GhostClient {
    private api: AxiosInstance;
    private jwtHandler: GhostJWTHandler;

    public posts: GhostResource;
    public members: GhostResource;
    public tags: GhostResource;
    public newsletters: GhostResource;
    public pages: GhostResource;
    public webhooks: GhostResource;
    public users: GhostResource;
    public roles: GhostResource;
    public tiers: GhostResource;
    public offers: GhostResource;
    public invites: GhostResource;

    constructor(options: { url: string; key: string; version: string; tokenExpiration?: number }) {
        this.jwtHandler = new GhostJWTHandler(options.key, options.tokenExpiration);
        
        const baseURL = `${options.url.replace(/\/$/, '')}/ghost/api/admin`;

        this.api = axios.create({
            baseURL,
            params: {
                key: undefined, // Admin API uses JWT, not query key
            }
        });

        // Request interceptor to add Authorization header
        this.api.interceptors.request.use((config: any) => {
            const token = this.jwtHandler.getToken();
            config.headers.Authorization = `Ghost ${token}`;
            config.headers['Accept-Version'] = options.version;
            return config;
        });

        // Initialize resources
        this.posts = new GhostResource(this.api, 'posts');
        this.members = new GhostResource(this.api, 'members');
        this.tags = new GhostResource(this.api, 'tags');
        this.newsletters = new GhostResource(this.api, 'newsletters');
        this.pages = new GhostResource(this.api, 'pages');
        this.webhooks = new GhostResource(this.api, 'webhooks');
        this.users = new GhostResource(this.api, 'users');
        this.roles = new GhostResource(this.api, 'roles');
        this.tiers = new GhostResource(this.api, 'tiers');
        this.offers = new GhostResource(this.api, 'offers');
        this.invites = new GhostResource(this.api, 'invites');
    }
}

