import { describe, it, expect, vi } from "vitest";
import { createBroadcastWithStream } from "../src/worker/broadcast/orchestrator";
import type { YouTubeClient } from "../src/worker/youtube/client";

function makeMockClient(overrides: Partial<YouTubeClient> = {}): YouTubeClient {
  return {
    insertBroadcast: vi.fn().mockResolvedValue({ broadcastId: "bcast-1", videoId: "video-1" }),
    insertStream: vi.fn().mockResolvedValue({
      streamId: "stream-1",
      streamKey: "key-abc",
      ingestionAddress: "rtmp://a.rtmp.youtube.com/live2",
    }),
    bind: vi.fn().mockResolvedValue(undefined),
    setThumbnail: vi.fn().mockResolvedValue(undefined),
    deleteBroadcast: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const params = {
  title: "テスト配信",
  description: "概要欄",
  privacyStatus: "private" as const,
  scheduledStartTime: "2026-06-20T12:00:00Z",
};

describe("createBroadcastWithStream", () => {
  it("正常系: 枠作成→ストリーム作成→bind の順に実行し、結果を返す", async () => {
    const yt = makeMockClient();
    const result = await createBroadcastWithStream(yt, params);

    expect(result).toEqual({
      videoId: "video-1",
      broadcastId: "bcast-1",
      streamId: "stream-1",
      watchUrl: "https://www.youtube.com/watch?v=video-1",
      streamKey: "key-abc",
      ingestionAddress: "rtmp://a.rtmp.youtube.com/live2",
    });

    const order = [
      (yt.insertBroadcast as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]!,
      (yt.insertStream as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]!,
      (yt.bind as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0]!,
    ];
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(yt.bind).toHaveBeenCalledWith("bcast-1", "stream-1");
    expect(yt.deleteBroadcast).not.toHaveBeenCalled();
  });

  it("サムネイル付き: bind 後に setThumbnail が呼ばれる", async () => {
    const yt = makeMockClient();
    const thumbnail = { data: new Uint8Array([1]).buffer, contentType: "image/png" };

    await createBroadcastWithStream(yt, { ...params, thumbnail });

    expect(yt.setThumbnail).toHaveBeenCalledWith("video-1", thumbnail.data, "image/png");
  });

  it("サムネイルなし: setThumbnail は呼ばれない", async () => {
    const yt = makeMockClient();
    await createBroadcastWithStream(yt, params);
    expect(yt.setThumbnail).not.toHaveBeenCalled();
  });

  it("ストリーム作成失敗時: 作成済みの配信枠を削除（ロールバック）してエラーを再送出", async () => {
    const yt = makeMockClient({
      insertStream: vi.fn().mockRejectedValue(new Error("stream failed")),
    });

    await expect(createBroadcastWithStream(yt, params)).rejects.toThrow("stream failed");
    expect(yt.deleteBroadcast).toHaveBeenCalledWith("bcast-1");
  });

  it("bind 失敗時: 配信枠を削除してエラーを再送出", async () => {
    const yt = makeMockClient({
      bind: vi.fn().mockRejectedValue(new Error("bind failed")),
    });

    await expect(createBroadcastWithStream(yt, params)).rejects.toThrow("bind failed");
    expect(yt.deleteBroadcast).toHaveBeenCalledWith("bcast-1");
  });

  it("枠作成自体の失敗時: ロールバック不要でそのままエラー", async () => {
    const yt = makeMockClient({
      insertBroadcast: vi.fn().mockRejectedValue(new Error("insert failed")),
    });

    await expect(createBroadcastWithStream(yt, params)).rejects.toThrow("insert failed");
    expect(yt.deleteBroadcast).not.toHaveBeenCalled();
  });

  it("ロールバック自体が失敗しても元のエラーを送出する", async () => {
    const yt = makeMockClient({
      bind: vi.fn().mockRejectedValue(new Error("bind failed")),
      deleteBroadcast: vi.fn().mockRejectedValue(new Error("delete also failed")),
    });

    await expect(createBroadcastWithStream(yt, params)).rejects.toThrow("bind failed");
  });

  it("サムネイル設定の失敗は致命的でない（予約自体は成功扱い）", async () => {
    const yt = makeMockClient({
      setThumbnail: vi.fn().mockRejectedValue(new Error("thumb failed")),
    });
    const thumbnail = { data: new Uint8Array([1]).buffer, contentType: "image/png" };

    const result = await createBroadcastWithStream(yt, { ...params, thumbnail });

    expect(result.videoId).toBe("video-1");
    expect(result.thumbnailWarning).toBeDefined();
    expect(yt.deleteBroadcast).not.toHaveBeenCalled();
  });
});
