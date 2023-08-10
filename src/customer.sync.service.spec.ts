import { Collection, Db, MongoClient, Timestamp } from "mongodb";
import { config } from "dotenv-safe";
import { Customer } from "./dto";
import { CustomerGeneratorService } from "./customer.generator.service";
import { CustomerSyncService } from "./customer.sync.service";

config();

const { DB_URI } = process.env;

const TOKEN_COLLECTION_NAME = "sync-token";

process.on("uncaughtException", (err) => console.error(err));

describe("CustomerSyncService", () => {
  let client: MongoClient;
  let db: Db;
  let customerCollection: Collection<Customer>;
  let anonymCustomerCollection: Collection<Customer>;
  let tokenCollection: Collection<any>;

  let customerService: CustomerGeneratorService;
  let syncCustomerService: CustomerSyncService;

  beforeAll(async () => {
    client = new MongoClient(DB_URI);
    await client.connect();
    db = client.db("test");
    customerCollection = db.collection("customers");
    anonymCustomerCollection = db.collection("customers_anonymised");
    tokenCollection = db.collection(TOKEN_COLLECTION_NAME);

    customerService = new CustomerGeneratorService(customerCollection);

    syncCustomerService = new CustomerSyncService(
      tokenCollection,
      customerCollection,
      anonymCustomerCollection,
    );
  });
  afterEach(async () => {
    await syncCustomerService.destroy();
    await db.dropCollection(TOKEN_COLLECTION_NAME);
  });
  afterAll(() => client.close());

  it("has to sync all the customers", async () => {
    syncCustomerService.watch();

    await delay(500);

    const customers = await customerService.generateAndSaveRandomCustomers(15);

    await delay(1500);

    const syncedCustomers = await anonymCustomerCollection
      .find({ _id: { $in: customers } })
      .toArray();

    expect(syncedCustomers).toHaveLength(15);

    await syncCustomerService.destroy();

    await delay(1500);
  });

  it("has to resume sync from the right place", async () => {
    syncCustomerService.watch();

    await new Promise((res) => setTimeout(res, 500));

    // stop sync
    await syncCustomerService.destroy();
    const customers = await customerService.generateAndSaveRandomCustomers(11);

    await delay(500);

    // resume sync
    syncCustomerService.watch();

    await delay(1500);

    const syncedCustomers = await anonymCustomerCollection
      .find({ _id: { $in: customers } })
      .toArray();

    expect(syncedCustomers).toHaveLength(11);
  });

  it("has to sync updated customers", async () => {
    syncCustomerService.watch();

    await new Promise((res) => setTimeout(res, 500));

    const [customer1] = await customerService.generateAndSaveRandomCustomers(1);

    await customerCollection.updateOne(
      { _id: customer1 },
      { $set: { test_field: 123 } as Partial<Customer> },
    );

    await delay(1000);

    const syncedCustomer1 = await anonymCustomerCollection.findOne({
      _id: customer1,
    });

    expect(syncedCustomer1["test_field"]).toEqual(123);
  });
});

function delay(ms?: number): Promise<void> {
  return new Promise((res) => setTimeout(res, ms));
}
