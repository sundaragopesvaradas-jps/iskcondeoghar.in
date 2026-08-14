import { CosmosClient, Container, Database } from '@azure/cosmos';

let client: CosmosClient | null = null;
let database: Database | null = null;

export function getCosmosConfig() {
  const endpoint = (process.env.COSMOS_ENDPOINT || '').trim();
  const key = (process.env.COSMOS_KEY || '').trim();
  const databaseId = (process.env.COSMOS_DB || 'iskcon').trim();
  return { endpoint, key, databaseId };
}

export function isCosmosConfigured(): boolean {
  const { endpoint, key } = getCosmosConfig();
  return Boolean(endpoint && key);
}

function getClient(): CosmosClient {
  const { endpoint, key } = getCosmosConfig();
  if (!endpoint || !key) {
    throw new Error('Cosmos DB is not configured (COSMOS_ENDPOINT / COSMOS_KEY).');
  }
  if (!client) {
    client = new CosmosClient({ endpoint, key });
  }
  return client;
}

export function getCosmosDatabase(): Database {
  if (!database) {
    const { databaseId } = getCosmosConfig();
    database = getClient().database(databaseId);
  }
  return database;
}

export function getRowsContainer(): Container {
  return getCosmosDatabase().container('rows');
}

export function getTablesContainer(): Container {
  return getCosmosDatabase().container('tables');
}
