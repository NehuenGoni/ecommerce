import "dotenv/config";
import { createApp } from "./app.js";
import { loadEnv } from "./config/env.js";

const env = loadEnv();

// TODO: conectar a MongoDB antes de levantar el server (próximo módulo).

const app = createApp(env.CLIENT_URL);

app.listen(env.PORT, () => {
  console.log(`Server escuchando en http://localhost:${env.PORT}`);
});
