import { version } from '#lib/server/fetchVersion';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = () => {
  return { version };
};
