export const DEFAULT_POST_LOGIN_PATH = "/dashboard";
export const LOGIN_PATH = "/login";

const AUTH_LOOP_PREFIXES = ["/login", "/auth"];

/** Matches App route `/courses/:slug` */
export function courseDetailPath(slug: string): string {
  return `/courses/${slug}`;
}

/** Matches App route `/courses/:slug/learn` */
export function courseLearnPath(slug: string, search = ""): string {
  return `/courses/${slug}/learn${search}`;
}

/** Matches App route `/on-demand/:slug` */
export function onDemandCoursePath(slug: string): string {
  return `/on-demand/${slug}`;
}

/** Matches App route `/guides/:slug` */
export function guideCoursePath(slug: string): string {
  return `/guides/${slug}`;
}

export function parseNextSearchParam(searchParams: URLSearchParams): string {
  return getSafeNextPath(searchParams.get("next") ?? searchParams.get("redirect"));
}

function isAuthLoopPath(path: string): boolean {
  if (path === "/") return true;
  return AUTH_LOOP_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}?`) || path.startsWith(`${prefix}/`),
  );
}

export function getSafeNextPath(raw: string | null | undefined): string {
  if (!raw) return DEFAULT_POST_LOGIN_PATH;

  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_POST_LOGIN_PATH;

  let decoded: string;
  try {
    decoded = decodeURIComponent(trimmed);
  } catch {
    return DEFAULT_POST_LOGIN_PATH;
  }

  if (!decoded.startsWith("/") || decoded.startsWith("//")) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  const schemeIndex = decoded.indexOf(":");
  if (schemeIndex > 0 && schemeIndex < decoded.indexOf("/")) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  if (isAuthLoopPath(decoded)) {
    return DEFAULT_POST_LOGIN_PATH;
  }

  return decoded;
}

export function buildLoginUrl(fromPath: string, extraParams?: Record<string, string>): string {
  const trimmed = fromPath.trim();
  const params = new URLSearchParams(extraParams);

  if (!trimmed || isAuthLoopPath(trimmed)) {
    const query = params.toString();
    return query ? `${LOGIN_PATH}?${query}` : LOGIN_PATH;
  }

  const safe = getSafeNextPath(trimmed);
  if (safe === DEFAULT_POST_LOGIN_PATH) {
    const query = params.toString();
    return query ? `${LOGIN_PATH}?${query}` : LOGIN_PATH;
  }

  params.set("next", safe);
  return `${LOGIN_PATH}?${params.toString()}`;
}
