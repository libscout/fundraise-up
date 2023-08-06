import {
  AnyBulkWriteOperation,
  Collection,
  OptionalId,
  OptionalUnlessRequiredId,
} from "mongodb";
import { Document } from "bson";
import { Writable, WritableOptions } from "stream";
import { Customer } from "./dto";

const FLUSH_BUFFER_INTERVAL_MS = 1000;
const MAX_SINGLE_BUFFER_SIZE = 10;
const buffers: SaveBuffer<any>[] = [];
let timer: NodeJS.Timer | undefined;

function startTimer(): void {
  timer = setInterval(() => flushAll(), FLUSH_BUFFER_INTERVAL_MS);
}

async function flushAll(): Promise<void> {
  await Promise.all(buffers.map((i) => i.flush()));
}

process.on("exit", async () => {
  await Promise.all(buffers.map((i) => i.end()));
});

export class SaveBuffer<T extends { _id: any }> {
  private readonly buffer: T[] = [];

  constructor(private readonly target: Collection<T>) {
    buffers.push(this);
    timer || startTimer();
  }

  async end(): Promise<void> {
    const index = buffers.indexOf(this);
    if (index === -1) return;
    await this.flush();

    buffers.splice(index, 1);
    if (buffers.length) return;

    timer && clearInterval(timer);
    timer = undefined;
  }

  async addDocument(doc: T | T[]): Promise<void> {
    this.buffer.push(...(Array.isArray(doc) ? doc : [doc]));
    this.buffer.length >= MAX_SINGLE_BUFFER_SIZE && (await this.flush());
  }

  async flush(): Promise<void> {
    if (!this.buffer.length) return;
    const bulk = this.createBulk(this.buffer.splice(0));
    await this.target.bulkWrite(bulk);
  }

  private createBulk(customers: T[]): AnyBulkWriteOperation<T>[] {
    return customers.map(
      (doc) =>
        ({
          updateOne: {
            filter: { _id: doc._id },
            update: { $set: doc },
            upsert: true,
          },
        }) as AnyBulkWriteOperation<T>,
    );
  }
}

export class MdbWritableStream<T extends { _id: any }> extends Writable {
  private readonly entityBuff: SaveBuffer<T>;

  constructor(target: Collection<T>) {
    super({ objectMode: true });
    this.entityBuff = new SaveBuffer<T>(target);
  }

  _writev(
    chunks: {
      chunk: T;
      encoding: BufferEncoding;
    }[],
    callback: (error?: Error | null) => void,
  ): void {
    this.entityBuff
      .addDocument(chunks.map((i: any) => i.chunk))
      .then(() => callback())
      .catch(callback);
  }

  _write(
    chunk: T,
    encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    this.entityBuff
      .addDocument(chunk as any)
      .then(() => callback())
      .catch(callback);
  }

  _final(callback: (error?: Error | null) => void): void {
    this.entityBuff
      .end()
      .then(() => callback())
      .catch(callback);
  }
}
