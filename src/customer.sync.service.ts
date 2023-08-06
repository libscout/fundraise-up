import { Collection, Db } from "mongodb";
import { Customer } from "./dto";
import { pipeline, Transform } from "stream";
import { CustomerTransformerStream } from "./customer.transformer";
import { MdbWritableStream } from "./save.buffer";

export class CustomerSyncService {
  private readonly db: Db;
  constructor(
    private readonly source: Collection<Customer>,
    private readonly target: Collection<Customer>,
  ) {}

  async fullSync(): Promise<void> {
    const cursor = this.source.find();

    await new Promise((res, rej) => {
      pipeline(
        cursor.stream(),
        new CustomerTransformerStream(),
        new MdbWritableStream(this.target),
        (err) => (err ? rej(err) : res(null)),
      );
    });
  }

  async watch(): Promise<void> {
    await new Promise((res, rej) => {
      pipeline(
        this.source.watch().stream(),
        new CustomerTransformerStream(),
        new MdbWritableStream(this.target),
        (err) => (err ? rej(err) : res(null)),
      );
    });
  }
}

class ChangeStreamTransformer extends Transform {
  constructor() {
    super({ objectMode: true });
  }
}
