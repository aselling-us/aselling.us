import { defineEnvVars } from "@sveltejs/kit/env";
// import * as v from 'valibot'; // or any Standard Schema validator

export const variables = defineEnvVars({
  HARDCOVER_TOKEN: {},
  DOMAIN_ROOT: { public: true },
  EMAIL: {},

  SMTP_HOST: {},
  SMTP_USER: {},
  SMTP_PASS: {},
  MAIL_FROM: {},
  WORKER_URL: {},
  UNSUBSCRIBE_SECRET: {},
  SPOTIFY_CLIENT_ID: {},
  SPOTIFY_CLIENT_SECRET: {},
  SPOTIFY_REFRESH_TOKEN: {},
  // optional: a schema function can supply a default when the value is missing
  SMTP_PORT: { schema: (v) => (v === undefined ? 587 : Number(v)) },
  SMTP_SECURE: { schema: (v) => v === "true" },
  MAIL_REPLY_TO: { schema: (v) => v ?? "" },
});
