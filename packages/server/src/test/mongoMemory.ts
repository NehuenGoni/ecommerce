import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

let mongod: MongoMemoryServer | null = null;

export async function connectTestDB(): Promise<void> {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  // Mongoose construye los índices (incluidos los unique) en background al
  // registrar cada modelo. Sin esto, un test puede insertar un duplicado
  // antes de que el índice único termine de crearse, dando un falso verde.
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
}

export async function disconnectTestDB(): Promise<void> {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongod?.stop();
  mongod = null;
}

export async function clearTestDB(): Promise<void> {
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
}
