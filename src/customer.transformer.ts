import { Transform, TransformCallback } from "stream";
import { Customer } from "./dto";
import { InferIdType } from "mongodb";
import { createHmac } from "node:crypto";

const RANDOM_STRING_LENGTH = 8;
const SECRET = "123qwe";

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
  chunk.email = chunk.email.replace(/^.*?@/, `${encrypt(chunk.email)}@`);
  chunk.firstName = encrypt(chunk.firstName);
  chunk.lastName = encrypt(chunk.lastName);
  chunk.address.line1 = encrypt(chunk.address.line1);
  chunk.address.line2 = encrypt(chunk.address.line2);
  chunk.address.postcode = encrypt(chunk.address.postcode);
  return chunk;
}

function encrypt(str: string): string {
  if (!str || typeof str !== "string") return str;

  const cryptoStr = hmac(str);
  if (cryptoStr.length >= RANDOM_STRING_LENGTH)
    return cryptoStr.slice(0, RANDOM_STRING_LENGTH);

  return fill(cryptoStr, RANDOM_STRING_LENGTH);
}

function hmac(str: string): string {
  return createHmac("sha256", SECRET).update(str).digest("hex");
}

function fill(str: string, length: number): string {
  if (!str) return fill("_", length);
  if (str.length >= length) return str.slice(0, length);
  return fill(str + str, length);
}
