const { TableClient, AzureNamedKeyCredential } = require("@azure/data-tables");

const tableName = "Visits";
const account = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

module.exports = async function (context, req) {
    const ip = req.headers['x-forwarded-for'] || req.headers['client-ip'] || req.connection?.remoteAddress;
    const timestamp = new Date().toISOString();

    // Only run if storage credentials are set
    if (!account || !accountKey) {
        context.res = { status: 500, body: "Storage credentials not set" };
        return;
    }

    const credential = new AzureNamedKeyCredential(account, accountKey);
    const client = new TableClient(
        `https://${account}.table.core.windows.net`,
        tableName,
        credential
    );

    // PartitionKey can be a constant, RowKey must be unique (use timestamp+random)
    const entity = {
        partitionKey: "visit",
        rowKey: `${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        ip,
        timestamp
    };

    try {
        await client.createEntity(entity);
        context.res = { status: 200, body: { message: "Visit logged" } };
    } catch (err) {
        context.log("Error logging visit:", err);
        context.res = { status: 500, body: "Error logging visit" };
    }
}; 
