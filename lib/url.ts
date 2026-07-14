// Ensures user-entered links like "www.google.com" are treated as absolute
// external URLs instead of paths relative to the current page (which would
// resolve under the app's basePath, e.g. "/ace_academy/google.com").
export function normalizeResourceUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) || trimmed.startsWith('//') || trimmed.startsWith('/')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}
