import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { Client } from 'pg';

export async function httpTrigger(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    
    const host = process.env.Postgresql_Host;
    const user = process.env.Postgresql_User;
    const database = process.env.Postgresql_Database;
    const port = Number(process.env.Postgresql_Port);
    const password = process.env.Postgresql_Password;
    
    const client = new Client({
        user: user,
        host: host,
        database: database,
        password: password,
        port: port,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        context.log('PostgreSQL connected');

        // Insert a row into the record table
        const createSchemaQuery = `
                CREATE TABLE record (
                    tx_id UUID NOT NULL PRIMARY KEY,
                    version TEXT NOT NULL,
                    kind TEXT NOT NULL CHECK (kind IN ('RecordLinkage', 'ProcessEventSet')),
                    system_id TEXT NOT NULL,
                    record_id TEXT NOT NULL,
                    record_kind TEXT NOT NULL CHECK (record_kind IN ('Permit', 'Project', 'Submission', 'Tracking')),
                    process_event JSONB NOT NULL
            );
            `;

        await client.query(createSchemaQuery);
        context.log('Created record table');

        await client.end();
    } catch (err) {
        context.log('Error connecting to PostgreSQL:', err);
        // return { status: 500, body: 'Error connecting to PostgreSQL' };
    }

    return { body: `Done!` };
};

app.http('httpTrigger', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: httpTrigger
});
