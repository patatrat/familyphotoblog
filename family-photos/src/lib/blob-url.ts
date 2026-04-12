export function blobProxy(url: string): string {
  return `/api/blob?url=${encodeURIComponent(url)}`
}
