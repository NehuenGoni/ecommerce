import mongoose from "mongoose";

mongoose.set("strictQuery", true);

export async function connectDB(uri: string): Promise<typeof mongoose> {
  return mongoose.connect(uri);
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
