import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase =
  url && key
    ? createClient(url, key, {
        global: {
          fetch: (input, options = {}) =>
            fetch(input, {
              ...options,
              signal: options.signal
                ? AbortSignal.any([options.signal, AbortSignal.timeout(15000)])
                : AbortSignal.timeout(15000),
            }),
        },
      })
    : null;
export const table = (name) => supabase.from(`camp_${name}`);
