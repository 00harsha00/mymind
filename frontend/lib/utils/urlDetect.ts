const URL_REGEX = /https?:\/\/[^\s<>"']+/g;

export function extractUrls(text: string): string[] {
  return Array.from(new Set(text.match(URL_REGEX) || []));
}

export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/.test(url);
}

export function stripUrls(text: string): string {
  return text.replace(URL_REGEX, "").replace(/\s{2,}/g, " ").trim();
}
