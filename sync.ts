import { MongoClient } from "mongodb";
import { config } from "dotenv-safe";
import { CustomerGeneratorService } from "./src/customer.generator.service";
import { Customer } from "./src/dto";
import { CustomerSyncService } from "./src/customer.sync.service";

config();
const { DB_URI } = process.env;
const FULL_SYNC = process.argv.includes("--full-reindex");

const client = new MongoClient(DB_URI);

const dbName = "test";

async function main() {
  await client.connect();
  console.log("Connected successfully to server");
  const db = client.db(dbName);

  const source = db.collection<Customer>("customers");
  const target = db.collection<Customer>("customers_anonymised");
  const tokenCollection = db.collection<any>("sync-token");
  const service = new CustomerSyncService(tokenCollection, source, target);

  process.on("exit", async () => {
    console.log("destroy CustomerSyncService");
    await service.destroy();
    await client.close();
  });

  FULL_SYNC ? await service.fullSync() : await service.watch();
  console.log("DONE");
}

main()
  .then(console.log)
  .catch(console.error)
  .finally(() => client.close());
