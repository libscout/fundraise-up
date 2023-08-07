import { MongoClient } from "mongodb";
import { config } from "dotenv-safe";
import { CustomerGeneratorService } from "./src/customer.generator.service";
import { Customer } from "./src/dto";

config();

const { DB_URI } = process.env;
const client = new MongoClient(DB_URI);

const dbName = "test";

async function main() {
  await client.connect();
  process.on("exit", async () => {
    await client.close();
  });

  console.log("Connected successfully to server");
  const db = client.db(dbName);

  const collection = db.collection<Customer>("customers");
  const service = new CustomerGeneratorService(collection);

  setInterval(() => {
    const random = Math.ceil(Math.random() * 10);
    service.generateAndSaveRandomCustomers(random);
  }, 200);
}

main().then(console.log).catch(console.error);
