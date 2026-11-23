import adapter from "@sveltejs/adapter-static";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    sveltekit({
      compilerOptions: {
        // Force runes mode for the project, except for libraries. Can be removed in svelte 6.
        runes: ({ filename }) =>
          filename.split(/[/\\]/).includes("node_modules") ? undefined : true,
      },

      // adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
      // If your environment is not supported, or you settled on a specific environment, switch out the adapter.
      // See https://svelte.dev/docs/kit/adapters for more information about adapters.
      adapter: adapter({ strict: false }),
      prerender: {
        handleUnseenRoutes: ({ routes }) => {
          const unexpected = routes.filter(
            (route) => route !== "/blog/draft/[slug]",
          );

          if (unexpected.length > 0) {
            throw new Error(`Routes not prerendered: ${unexpected.join(", ")}`);
          }
        },
      },
    }),
  ],
  server: {
    fs: {
      allow: [
        "../version.py", // Allows one folder up, or specify an exact path like path.resolve('../shared')
      ],
    },
  },
});
