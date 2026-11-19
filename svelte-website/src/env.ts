import { defineEnvVars } from '@sveltejs/kit/env';
// import * as v from 'valibot'; // or any Standard Schema validator

export const variables = defineEnvVars({
  HARDCOVER_TOKEN: {},
  PUBLIC_DOMAIN_ROOT: {public: true }
});
