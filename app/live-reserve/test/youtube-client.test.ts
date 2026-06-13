import { describe, it, expect, vi } from "vitest";
import { createYouTubeClient, YouTubeApiError } from "../src/worker/youtube/client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createYouTubeClient", () => {
  const token = "test-access-token";

  it("insertBroadcast: タイトル/説明/公開設定/日時を送り broadcastId と videoId を返す", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "bcast-1" }));
    const yt = createYouTubeClient(token, fetchMock);

    const result = await yt.insertBroadcast({
      title: "テスト配信",
      description: "概要",
      privacyStatus: "private",
      scheduledStartTime: "2026-06-20T12:00:00Z",
    });

    expect(result).toEqual({ broadcastId: "bcast-1", videoId: "bcast-1" });

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("liveBroadcasts");
    expect(String(url)).toContain("part=");
    expect(init.method).toBe("POST");
    expect(init.headers["Authorization"]).toBe(`Bearer ${token}`);
    const body = JSON.parse(init.body);
    expect(body.snippet.title).toBe("テスト配信");
    expect(body.snippet.scheduledStartTime).toBe("2026-06-20T12:00:00Z");
    expect(body.status.privacyStatus).toBe("private");
  });

  it("insertStream: streamId / streamKey / ingestionAddress を返す", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({
        id: "stream-1",
        cdn: {
          ingestionInfo: {
            streamName: "key-abc",
            ingestionAddress: "rtmp://a.rtmp.youtube.com/live2",
          },
        },
      }),
    );
    const yt = createYouTubeClient(token, fetchMock);

    const result = await yt.insertStream({ title: "テスト配信" });

    expect(result).toEqual({
      streamId: "stream-1",
      streamKey: "key-abc",
      ingestionAddress: "rtmp://a.rtmp.youtube.com/live2",
    });
    expect(String(fetchMock.mock.calls[0]![0])).toContain("liveStreams");
  });

  it("bind: broadcastId と streamId を紐付ける", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "bcast-1" }));
    const yt = createYouTubeClient(token, fetchMock);

    await yt.bind("bcast-1", "stream-1");

    const [url] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("liveBroadcasts/bind");
    expect(String(url)).toContain("id=bcast-1");
    expect(String(url)).toContain("streamId=stream-1");
  });

  it("deleteBroadcast: 配信枠を削除する（ロールバック用）", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const yt = createYouTubeClient(token, fetchMock);

    await yt.deleteBroadcast("bcast-1");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("liveBroadcasts");
    expect(String(url)).toContain("id=bcast-1");
    expect(init.method).toBe("DELETE");
  });

  it("setThumbnail: 画像をアップロードする", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({}));
    const yt = createYouTubeClient(token, fetchMock);
    const image = new Uint8Array([1, 2, 3]).buffer;

    await yt.setThumbnail("video-1", image, "image/png");

    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain("thumbnails/set");
    expect(String(url)).toContain("videoId=video-1");
    expect(init.headers["Content-Type"]).toBe("image/png");
  });

  it("APIエラー時は YouTubeApiError を投げ、status と reason を保持する", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        { error: { code: 403, message: "Quota exceeded", errors: [{ reason: "quotaExceeded" }] } },
        403,
      ),
    );
    const yt = createYouTubeClient(token, fetchMock);

    const err = await yt
      .insertBroadcast({
        title: "x",
        description: "",
        privacyStatus: "private",
        scheduledStartTime: "2026-06-20T12:00:00Z",
      })
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(YouTubeApiError);
    expect((err as YouTubeApiError).status).toBe(403);
    expect((err as YouTubeApiError).reason).toBe("quotaExceeded");
    expect((err as YouTubeApiError).message).toContain("Quota exceeded");
  });
});
