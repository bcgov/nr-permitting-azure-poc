declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        email: string;
        roles: string[];
      };
    }
  }
}

export {};
