import { MongoClient } from "mongodb";
import { config } from "dotenv-safe";
import { CustomerGeneratorService } from "./src/customer.generator.service";
import { Customer } from "./src/dto";
import { CustomerSyncService } from "./src/customer.sync.service";

config();
const { DB_URI } = process.env;

const client = new MongoClient(DB_URI);

const dbName = "myProject";

async function main() {
  await client.connect();
  console.log("Connected successfully to server");
  const db = client.db(dbName);

  const source = db.collection<Customer>("Customer");
  const target = db.collection<Customer>("customers_anonymised");
  const service = new CustomerSyncService(source, target);

  await service.fullSync();
  console.log("DONE");
}

main()
  .then(console.log)
  .catch(console.error)
  .finally(() => client.close());
