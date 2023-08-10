import {
  ChangeStream,
  ChangeStreamDocument,
  Collection,
  Db,
  ResumeToken,
  Timestamp,
} from "mongodb";
import { Customer } from "./dto";
import { pipeline, Transform, TransformCallback } from "stream";
import { CustomerTransformerStream } from "./customer.transformer";
import { MdbWritableStream } from "./save.buffer";

const COLLECTION_SYNC_KEY = "sync-customers";

interface ISyncToken {
  _id: string;
  token: ResumeToken;
}

export class CustomerSyncService {
  private changeStream: ChangeStream;

  constructor(
    private readonly tokenCollection: Collection<ISyncToken>,
    private readonly source: Collection<Customer>,
    private readonly target: Collection<Customer>,
  ) {}

  async fullSync(): Promise<void> {
    const cursor = this.source.find();
    console.log("start full reindex");
    await new Promise((res, rej) => {
      pipeline(
        cursor.stream(),
        new CustomerTransformerStream(),
        new MdbWritableStream(this.target),
        (err) => {
          err ? rej(err) : res(null);
        },
      );
    });
  }

  async watch(): Promise<void> {
    const changeStream = await this.createChangeStream();
    console.log("start watching");
    await new Promise((res, rej) => {
      pipeline(
        changeStream.stream(),
        new ChangeStreamTransformer(),
        new CustomerTransformerStream(),
        new MdbWritableStream(this.target),
        (err) => (err ? rej(err) : res(null)),
      );
    });
  }

  private async createChangeStream(): Promise<ChangeStream> {
    if (this.changeStream) return this.changeStream;

    const resumeAfter = await this.findResumeToken();
    this.changeStream = this.source.watch(undefined, {
      resumeAfter,
      fullDocument: "updateLookup",
    });
    await this.saveResumeToken();
    return this.changeStream;
  }

  private async findResumeToken(): Promise<ResumeToken | undefined> {
    const token = await this.tokenCollection.findOne<ISyncToken>({
      _id: COLLECTION_SYNC_KEY,
    });
    return token?.token;
  }

  async destroy(): Promise<void> {
    await this.saveResumeToken();
    await this.changeStream?.close();
    this.changeStream = undefined;
  }

  private async saveResumeToken(): Promise<void> {
    if (!this.changeStream) return;
    await this.tokenCollection.updateOne(
      { _id: COLLECTION_SYNC_KEY },
      { $set: { token: this.changeStream.resumeToken } },
      { upsert: true },
    );
  }
}

class ChangeStreamTransformer<T extends { _id: any }> extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(
    chunk: { fullDocument?: T },
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    if (!chunk?.fullDocument) return callback();
    callback(null, chunk.fullDocument);
  }
}
