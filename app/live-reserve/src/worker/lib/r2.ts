import type { ThumbnailStore } from "../types";

export function createR2ThumbnailStore(bucket: R2Bucket): ThumbnailStore {
  return {
    async put(key, data, contentType) {
      await bucket.put(key, data, { httpMetadata: { contentType } });
    },
    async get(key) {
      const obj = await bucket.get(key);
      if (!obj) return null;
      return {
        data: await obj.arrayBuffer(),
        contentType: obj.httpMetadata?.contentType ?? "application/octet-stream",
      };
    },
  };
}
