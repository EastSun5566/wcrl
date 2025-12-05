export function isValidUrl(url: string) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function createMatchRegex(pattern: string) {
  const escaped = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '___DOUBLE___')
    .replace(/\*/g, '[^/]*')
    .replace(/___DOUBLE___/g, '.*');
  return new RegExp('^' + escaped + '$');
}

export function getBaseDomain(url: string) {
  try {
    const { hostname } = new URL(url);
    return hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function normalizeUrl(href: string, baseUrl: string) {
  try {
    const url = new URL(href, baseUrl);
    // Remove hash to avoid treating anchors as different URLs
    url.hash = '';
    return url.href;
  } catch {
    return href;
  }
}

export function isExternal(url: string, baseDomain: string) {
  try {
    const { hostname } = new URL(url);
    return !hostname.replace(/^www\./, '').endsWith(baseDomain);
  } catch {
    return false;
  }
}