import atomico from "@atomico/vite";
import { encode } from "@jridgewell/sourcemap-codec";

/**
 * @atomico/vite's plugins, for vite 8.
 *
 * They return source maps with decoded mappings, which rollup allowed, but
 * vite 8's bundler, rolldown, doesn't. So they're encoded here. This can go
 * once atomico does it, or once atomico is gone.
 *
 * @param {Parameters<typeof atomico>[0]} options
 */
export default function atomicoPlugins(options) {
  return atomico(options).map(encodeMaps);
}

function encodeMaps(plugin) {
  const hook = plugin.transform;
  if (!hook) return plugin;
  const handler = typeof hook === "function" ? hook : hook.handler;

  async function transform(...args) {
    const result = await handler.apply(this, args);
    if (!Array.isArray(result?.map?.mappings)) return result;

    const mappings = encode(result.map.mappings);
    return { ...result, map: { ...result.map, mappings } };
  }

  return {
    ...plugin,
    transform:
      typeof hook === "function" ? transform : { ...hook, handler: transform },
  };
}
