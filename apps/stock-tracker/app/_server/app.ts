import { createApp, createIdentityProvider } from "@kottster/server";
import schema from "../../kottster-app.json";

export const app = createApp({
  schema,
  secretKey: process.env.APP_SECRET_KEY,
  kottsterApiToken: process.env.APP_API_TOKEN,
  identityProvider: createIdentityProvider("sqlite", {
    fileName: "app.db",
    passwordHashAlgorithm: "bcrypt",
    jwtSecretSalt: process.env.APP_JWT_SECRET,
    rootUsername: process.env.APP_ROOT_USERNAME,
    rootPassword: process.env.APP_ROOT_PASSWORD,
  }),
});
