declare module "express" {
    export interface Request {
        headers: Record<string, string | string[] | undefined>;
        body?: unknown;
    }

    export interface Response {
        status(code: number): this;
        json(body: unknown): this;
        send(body: unknown): this;
        on(event: string, listener: (...args: unknown[]) => void): this;
    }

    export interface Express {
        use(...handlers: unknown[]): this;
        post(path: string, handler: (req: Request, res: Response) => void | Promise<void>): this;
        get(path: string, handler: (req: Request, res: Response) => void | Promise<void>): this;
        listen(port: number, callback?: () => void): unknown;
    }

    function express(): Express;
    namespace express {
        function json(): unknown;
    }
    export default express;
}

declare module "cors" {
    type Cors = () => unknown;
    const cors: Cors;
    export default cors;
}

declare module "jsonwebtoken" {
    export interface SignOptions {
        algorithm?: string;
        keyid?: string;
    }

    export function sign(payload: object, secret: unknown, options?: SignOptions): string;
}
