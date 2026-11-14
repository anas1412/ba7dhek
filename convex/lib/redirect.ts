// Where a finished sign-in may send its result. Convex Auth calls this check
// when Google hands the person back, before it attaches the one-time code.

// The app's own link scheme, from app.json.
const APP_SCHEMES = ["ba7dhek://", "exp+ba7dhek://"];

/**
 * True when `redirectTo` is the phone app, or the one web address allowed for
 * development.
 *
 * `devWebOrigin` comes from the DEV_WEB_ORIGIN environment variable, which is
 * set on the dev deployment only (for example http://localhost:8081).
 * Production leaves it unset, so there the result can only go to the app.
 */
export function isAllowedRedirect(redirectTo: string, devWebOrigin: string | undefined): boolean {
  if (APP_SCHEMES.some((scheme) => redirectTo.startsWith(scheme))) return true;
  if (!devWebOrigin) return false;
  // Exact origin, or a path or query under it. A longer host name that merely
  // starts with the origin ("http://localhost:8081.evil.example") is refused.
  return (
    redirectTo === devWebOrigin ||
    redirectTo.startsWith(`${devWebOrigin}/`) ||
    redirectTo.startsWith(`${devWebOrigin}?`)
  );
}
