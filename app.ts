import { MongoClient } from "mongodb";
import { config } from "dotenv-safe";
import { CustomerGeneratorService } from "./src/customer.generator.service";
import { Customer } from "./src/dto";

config();

const { DB_URI } = process.env;
const client = new MongoClient(DB_URI);

const dbName = "myProject";

async function main() {
  await client.connect();
  console.log("Connected successfully to server");
  const db = client.db(dbName);

  const collection = db.collection<Customer>("Customer");
  const service = new CustomerGeneratorService(collection);

  setInterval(() => {
    const random = Math.ceil(Math.random() * 10);
    service.generateAndSaveRandomCustomers(random);
  }, 200);
}

main()
  .then(console.log)
  .catch(console.error)
  .finally(() => client.close());
