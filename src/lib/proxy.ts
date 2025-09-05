import type { RequestHandler } from '@sveltejs/kit';

const UPSTREAM = 'https://geo.so.ch';

// ---------- helpers for /map HTML/CSS -----------------

function injectBaseHref(html: string) {
  if (/<base\s/i.test(html)) return html;
  return html.replace(/<head([^>]*)>/i, `<head$1><base href="/map/">`);
}

function rewriteRootAbsAttrs(html: string) {
  // href/src/action="/x" -> "/map/x" (but leave ones already under /map/)
  return html
    .replace(/\b(href|src|action)=(")\/(?!map\/)/gi, '$1=$2map/')
    .replace(/\b(href|src|action)=(')\/(?!map\/)/gi, '$1=$2map/');
}

function rewriteSrcset(html: string) {
  return html.replace(/\bsrcset=(["'])([^"']+)\1/gi, (_m, q, list: string) => {
    const rewritten = list
      .split(',')
      .map((part) => {
        const [url, descriptor] = part.trim().split(/\s+/, 2);
        if (url?.startsWith('/') && !url.startsWith('/map/')) {
          return `/map${url}${descriptor ? ' ' + descriptor : ''}`;
        }
        return part.trim();
      })
      .join(', ');
    return `srcset=${q}${rewritten}${q}`;
  });
}

function rewriteCssUrls(css: string) {
  // url(/foo.png) -> url(/map/foo.png)
  return css.replace(/url\(\s*\/(?!map\/)/gi, 'url(/map/');
}

async function maybeRewriteBody(res: Response): Promise<Response> {
  const ct = res.headers.get('content-type') || '';
  const isHTML = ct.includes('text/html');
  const isCSS = ct.includes('text/css');

  if (!isHTML && !isCSS) return res;

  let text = await res.text();
  if (isHTML) {
    text = injectBaseHref(text);
    text = rewriteRootAbsAttrs(text);
    text = rewriteSrcset(text);
  } else if (isCSS) {
    text = rewriteCssUrls(text);
  }

  const headers = new Headers(res.headers);
  headers.delete('content-length');
  return new Response(text, { status: res.status, headers });
}

// ---------- generic pieces --------------------------------

function upstreamPathFromLocal(prefix: string, localPathname: string, search: string) {
  // prefix is "/map" or "/api" or "/ows"
  const rest = localPathname.slice(prefix.length); // '' | '/' | '/foo'
  return prefix + rest + search;
}

function rewriteLocationToLocal(loc: string): string {
  const abs = new URL(loc, UPSTREAM); // supports relative/absolute
  return abs.pathname + abs.search + abs.hash;
}

/**
 * Create a SvelteKit RequestHandler that proxies a given prefix to the upstream.
 * @param opts.prefix  "/map" | "/api" | "/ows"
 * @param opts.rewriteHtml  true to rewrite HTML/CSS (only needed for /map)
 */
export function makeProxyHandler(opts: { prefix: '/map' | '/api' | '/ows'; rewriteHtml?: boolean }): RequestHandler {
  const { prefix, rewriteHtml = false } = opts;

  return async ({ request, url, fetch }) => {
    const upstreamUrl = new URL(
      upstreamPathFromLocal(prefix, url.pathname, url.search),
      UPSTREAM
    );

    // First hop: manual redirects to control /map <-> /map/ flip
    let res = await fetch(upstreamUrl, {
      method: request.method,
      headers: new Headers(request.headers),
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'manual'
    });

    // Slash-flip guard: only relevant when upstream flips exactly prefix vs prefix+"/"
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (loc) {
        const target = new URL(loc, UPSTREAM);
        const upIsPrefix = target.pathname === prefix || target.pathname === `${prefix}/`;
        const meIsSlash = url.pathname.endsWith('/');
        if (upIsPrefix && (meIsSlash !== target.pathname.endsWith('/'))) {
          res = await fetch(new URL(target.pathname + target.search, UPSTREAM), {
            method: request.method,
            headers: new Headers(request.headers),
            body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
            redirect: 'manual'
          });
        }
      }
    }

    const headers = new Headers(res.headers);

    // Keep client-side redirects on our origin
    if (res.status >= 300 && res.status < 400) {
      const loc = headers.get('location');
      if (loc) {
        headers.set('location', rewriteLocationToLocal(loc));
        headers.set('cache-control', 'no-store');
      }
    }

    // Strip cookie Domain= so cookies stick to *our* host
    try {
      const multi = (headers as any).getSetCookie?.() as string[] | undefined;
      if (multi?.length) {
        headers.delete('set-cookie');
        for (const c of multi) headers.append('set-cookie', c.replace(/;\s*Domain=[^;]+/i, ''));
      } else {
        const single = headers.get('set-cookie');
        if (single) headers.set('set-cookie', single.replace(/;\s*Domain=[^;]+/i, ''));
      }
    } catch {}

    // If embedding is blocked and you have permission to adjust:
    // headers.delete('x-frame-options');
    // headers.delete('content-security-policy');

    const out = new Response(res.body, { status: res.status, headers });
    return rewriteHtml ? await maybeRewriteBody(out) : out;
  };
}
