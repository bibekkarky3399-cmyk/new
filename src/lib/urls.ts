export function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function publicMenuUrl(slug: string, tableToken?: string): string {
  const url = new URL(`/r/${slug}`, getAppUrl());
  if (tableToken) url.searchParams.set("t", tableToken);
  return url.toString();
}
