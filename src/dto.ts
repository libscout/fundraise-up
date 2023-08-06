import { ObjectId } from "mongodb";

export class Address {
  line1: string;
  line2: string;
  postcode: string;
  city: string;
  state: string;
  country: string;
}

export class Customer {
  readonly _id: ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  createdAt: Date;
  address: Address;
}
