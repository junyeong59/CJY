import { createApi } from "../_shared/handler.ts";
import { dependencies } from "../_shared/runtime.ts";
Deno.serve(createApi(dependencies()));
