import "dotenv/config";
import { createApp } from "./app.js";
import { connectDB, disconnectDB } from "./config/db.js";
import { env } from "./config/env.js";

async function bootstrap(): Promise<void> {
  await connectDB(env.MONGODB_URI);
  console.log("Conectado a MongoDB");

  const app = createApp(env.CLIENT_URL);
  const server = app.listen(env.PORT, () => {
    console.log(`Server escuchando en http://localhost:${env.PORT}`);
  });

  const shutdown = async (): Promise<void> => {
    server.close();
    await disconnectDB();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

bootstrap().catch((err: unknown) => {
  console.error("Error al iniciar el servidor", err);
  process.exit(1);
});
