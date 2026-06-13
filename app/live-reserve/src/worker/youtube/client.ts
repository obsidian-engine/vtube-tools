// YouTube Live Streaming API の薄い型付き fetch クライアント。
// googleapis SDK は Workers 非推奨かつ重いため REST を直接叩く（Design-Doc §5.1）。

const API_BASE = "https://www.googleapis.com/youtube/v3";
const UPLOAD_BASE = "https://www.googleapis.com/upload/youtube/v3";

export type PrivacyStatus = "public" | "unlisted" | "private";

export interface InsertBroadcastParams {
  title: string;
  description: string;
  privacyStatus: PrivacyStatus;
  scheduledStartTime: string; // ISO 8601
}

export interface InsertBroadcastResult {
  broadcastId: string;
  videoId: string;
}

export interface InsertStreamParams {
  title: string;
}

export interface InsertStreamResult {
  streamId: string;
  streamKey: string;
  ingestionAddress: string;
}

export interface YouTubeClient {
  insertBroadcast(params: InsertBroadcastParams): Promise<InsertBroadcastResult>;
  insertStream(params: InsertStreamParams): Promise<InsertStreamResult>;
  bind(broadcastId: string, streamId: string): Promise<void>;
  setThumbnail(videoId: string, image: ArrayBuffer, contentType: string): Promise<void>;
  deleteBroadcast(broadcastId: string): Promise<void>;
}

export class YouTubeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly reason?: string,
  ) {
    super(message);
    this.name = "YouTubeApiError";
  }
}

type FetchFn = (url: string, init: {
  method: string;
  headers: Record<string, string>;
  body?: string | ArrayBuffer;
}) => Promise<Response>;

async function throwIfError(res: Response): Promise<void> {
  if (res.ok) return;
  let message = `YouTube API error (HTTP ${res.status})`;
  let reason: string | undefined;
  try {
    const body = (await res.json()) as {
      error?: { message?: string; errors?: { reason?: string }[] };
    };
    if (body.error?.message) message = body.error.message;
    reason = body.error?.errors?.[0]?.reason;
  } catch {
    // 非JSONレスポンスはそのまま
  }
  throw new YouTubeApiError(message, res.status, reason);
}

export function createYouTubeClient(
  accessToken: string,
  fetchFn: FetchFn = fetch as unknown as FetchFn,
): YouTubeClient {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  return {
    async insertBroadcast(params) {
      const url = `${API_BASE}/liveBroadcasts?part=${encodeURIComponent("snippet,status,contentDetails")}`;
      const res = await fetchFn(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          snippet: {
            title: params.title,
            description: params.description,
            scheduledStartTime: params.scheduledStartTime,
          },
          status: {
            privacyStatus: params.privacyStatus,
            selfDeclaredMadeForKids: false,
          },
          contentDetails: { enableAutoStart: false, enableAutoStop: true },
        }),
      });
      await throwIfError(res);
      const body = (await res.json()) as { id: string };
      // liveBroadcast の id はそのまま動画IDとして使える
      return { broadcastId: body.id, videoId: body.id };
    },

    async insertStream(params) {
      const url = `${API_BASE}/liveStreams?part=${encodeURIComponent("snippet,cdn")}`;
      const res = await fetchFn(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          snippet: { title: params.title },
          cdn: { frameRate: "variable", ingestionType: "rtmp", resolution: "variable" },
        }),
      });
      await throwIfError(res);
      const body = (await res.json()) as {
        id: string;
        cdn: { ingestionInfo: { streamName: string; ingestionAddress: string } };
      };
      return {
        streamId: body.id,
        streamKey: body.cdn.ingestionInfo.streamName,
        ingestionAddress: body.cdn.ingestionInfo.ingestionAddress,
      };
    },

    async bind(broadcastId, streamId) {
      const url = `${API_BASE}/liveBroadcasts/bind?id=${encodeURIComponent(broadcastId)}&streamId=${encodeURIComponent(streamId)}&part=id`;
      const res = await fetchFn(url, { method: "POST", headers });
      await throwIfError(res);
    },

    async setThumbnail(videoId, image, contentType) {
      const url = `${UPLOAD_BASE}/thumbnails/set?videoId=${encodeURIComponent(videoId)}`;
      const res = await fetchFn(url, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": contentType },
        body: image,
      });
      await throwIfError(res);
    },

    async deleteBroadcast(broadcastId) {
      const url = `${API_BASE}/liveBroadcasts?id=${encodeURIComponent(broadcastId)}`;
      const res = await fetchFn(url, { method: "DELETE", headers });
      await throwIfError(res);
    },
  };
}
