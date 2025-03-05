import { app, InvocationContext, output } from "@azure/functions";

interface DatabaseItem {
    id: string;
    message: string;
}

export async function serviceBusQueueTrigger(message: unknown, context: InvocationContext): Promise<DatabaseItem> {
    context.log('Test =', context.triggerMetadata.messageId);
    return {
        id: context.triggerMetadata.messageId as string,
        message: message as string,
    };
}

app.serviceBusQueue('serviceBusQueueTrigger', {
    connection: 'ServiceBusConnection',
    queueName: 'inbound',
    return: output.cosmosDB({
        databaseName: 'Database',
        containerName: 'Container',
        createIfNotExists: true,
        connection: 'CosmosDB',
    }),    
    handler: serviceBusQueueTrigger
});