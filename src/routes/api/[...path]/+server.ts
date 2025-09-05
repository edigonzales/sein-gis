import type { RequestHandler } from './$types';
import { makeProxyHandler } from '$lib/proxy';

export const trailingSlash = 'ignore';

const handler = makeProxyHandler({ prefix: '/api', rewriteHtml: true });

export const GET: RequestHandler = handler;
export const POST: RequestHandler = handler;
export const PUT: RequestHandler = handler;
export const PATCH: RequestHandler = handler;
export const DELETE: RequestHandler = handler;
export const OPTIONS: RequestHandler = handler;
export const HEAD: RequestHandler = handler;
