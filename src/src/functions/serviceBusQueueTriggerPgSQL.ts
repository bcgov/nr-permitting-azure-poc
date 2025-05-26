import { app, InvocationContext } from "@azure/functions";
import { Client } from 'pg';

export async function serviceBusQueueTriggerPgSQL(message: any, context: InvocationContext): Promise<void> {
    context.log('Service bus queue function processed message:', JSON.stringify(message));
    context.log('Test log message');
    context.log('tx_id:', message.tx_id);
    context.log('process_event:', message.process_event);

    const host = process.env.Postgresql_Host;
    const user = process.env.Postgresql_Username;
    const database = process.env.Postgresql_Database;
    const port = Number(process.env.Postgresql_Port);
    const password = process.env.Postgresql_Password;
    
    context.log('PostgreSQL connection details:', {
        host: host,
        user: user,
        database: database,
        port: port
    });

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
        const insertQuery = `
            INSERT INTO record (tx_id, version, kind, system_id, record_id, record_kind, process_event)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
        `;
        const values = [
            message.tx_id,
            message.version,
            message.kind,
            message.system_id,
            message.record_id,
            message.record_kind,
            JSON.stringify(message.process_event)
        ];
        await client.query(insertQuery, values);
        context.log('Row inserted into record table');

        // Query the record table
        const res = await client.query('SELECT * FROM record');
        context.log('PostgreSQL response:', JSON.stringify(res.rows, null, 2));

        await client.end();
    } catch (err) {
        context.log('Error connecting to PostgreSQL:', err);
        // return { status: 500, body: 'Error connecting to PostgreSQL' };
    }

    //return { status: 200, body: `You've got a record!` };
}

app.serviceBusQueue('serviceBusQueueTriggerPgSQL', {
    connection: 'ServiceBusConnection',
    queueName: process.env.ServiceBus_Queue_Name, // <-- Use env variable
    handler: serviceBusQueueTriggerPgSQL
});