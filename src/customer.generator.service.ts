import { Collection, Db, EnhancedOmit } from "mongodb";
import { Address, Customer } from "./dto";
import { faker } from "@faker-js/faker";

export class CustomerGeneratorService {
  constructor(private readonly collection: Collection<Customer>) {}

  async generateAndSaveRandomCustomers(quantity: number): Promise<void> {
    const customers = this.randomNewCustomers(quantity);
    await this.collection.insertMany(customers);
  }

  private randomNewCustomers(length: number): Customer[] {
    return Array.from({ length }).map(() => this.randomNewCustomer());
  }

  private randomNewCustomer(): Customer {
    const firstName = faker.name.firstName();
    const lastName = faker.name.lastName();
    const dto = {
      address: this.randomAddress(),
      createdAt: new Date(),
      email: faker.internet.email(firstName, lastName),
      firstName,
      lastName,
    } as Customer;
    return Object.assign(new Customer(), dto);
  }

  private randomAddress(): Address {
    const state = faker.address.state();
    const addr: Address = {
      city: faker.address.city(),
      country: faker.address.country(),
      line1: faker.address.streetAddress(),
      line2: faker.address.secondaryAddress(),
      postcode: faker.address.zipCodeByState(state),
      state,
    };
    return Object.assign(new Address(), addr);
  }
}
