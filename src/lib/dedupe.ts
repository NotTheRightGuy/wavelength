/** Share one in-flight promise between concurrent callers; clears once it settles. */
export function dedupe<T>(fn: () => Promise<T>): () => Promise<T> {
  let inflight: Promise<T> | undefined
  return () => (inflight ??= fn().finally(() => { inflight = undefined }))
}
