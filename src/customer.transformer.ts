import { Transform, TransformCallback } from "stream";
import { Customer } from "./dto";
import { InferIdType, ObjectId } from "mongodb";

const RANDOM_STRING_LENGTH = 8;

export class CustomerTransformerStream extends Transform {
  constructor() {
    super({ objectMode: true });
  }

  _transform(
    chunk: Customer & InferIdType<Document>,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    if (!chunk) return callback();
    callback(null, anonymizeCustomer(chunk));
  }
}

function anonymizeCustomer(chunk: Customer & InferIdType<Document>): Customer {
  const str = getRandomString(chunk);
  chunk.email = chunk.email.replace(/^.*?@/, `${str}@`);
  chunk.firstName = str;
  chunk.lastName = str;
  chunk.address.line1 = str;
  chunk.address.line2 = str;
  chunk.address.postcode = str;
  return chunk;
}

function getRandomString(obj: { _id: ObjectId }): string {
  return obj._id.toHexString().slice(-1 * RANDOM_STRING_LENGTH);
}
