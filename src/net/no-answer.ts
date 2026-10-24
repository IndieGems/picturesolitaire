// Did a platform request get NO answer? The game standard: "A refusal from the
// platform is an answer, never offline." Every answer the platform gives, a
// refusal included (not_found, forbidden, rate_limited...), arrives as a
// GemApiError; anything else (a dropped connection, a timeout) is no answer,
// and only that is worth asking the connection check about (src/ui/online.ts, suspect).

import { GemApiError } from "@indiegems/gem-web-sdk/sdk";

export const noAnswer = (err: unknown): boolean => !(err instanceof GemApiError);

/** The platform's refusal code, for a short log line (no stack). */
export const refusalOf = (err: unknown): string => (err instanceof GemApiError ? (err.code ?? err.reason) : String(err));
