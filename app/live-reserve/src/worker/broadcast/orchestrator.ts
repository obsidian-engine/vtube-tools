// 配信予約作成のオーケストレーション（MVP-Design §7）:
//   1. liveBroadcasts.insert  2. liveStreams.insert  3. liveBroadcasts.bind
//   4. thumbnails.set（任意・失敗は非致命）
// 途中で失敗した場合は作成済みの配信枠を削除してロールバックする。

import type { PrivacyStatus, YouTubeClient } from "../youtube/client";

export interface CreateBroadcastParams {
  title: string;
  description: string;
  privacyStatus: PrivacyStatus;
  scheduledStartTime: string; // ISO 8601
  thumbnail?: { data: ArrayBuffer; contentType: string };
}

export interface CreateBroadcastResult {
  videoId: string;
  broadcastId: string;
  streamId: string;
  watchUrl: string;
  streamKey: string;
  ingestionAddress: string;
  thumbnailWarning?: string;
}

export async function createBroadcastWithStream(
  yt: YouTubeClient,
  params: CreateBroadcastParams,
): Promise<CreateBroadcastResult> {
  const { broadcastId, videoId } = await yt.insertBroadcast({
    title: params.title,
    description: params.description,
    privacyStatus: params.privacyStatus,
    scheduledStartTime: params.scheduledStartTime,
  });

  let stream: Awaited<ReturnType<YouTubeClient["insertStream"]>>;
  try {
    stream = await yt.insertStream({ title: params.title });
    await yt.bind(broadcastId, stream.streamId);
  } catch (err) {
    // 枠だけ残ると Studio 側にゴミが残るため削除を試みる。削除失敗より元エラーを優先。
    try {
      await yt.deleteBroadcast(broadcastId);
    } catch {
      // 元のエラーを優先して握りつぶす
    }
    throw err;
  }

  let thumbnailWarning: string | undefined;
  if (params.thumbnail) {
    try {
      await yt.setThumbnail(videoId, params.thumbnail.data, params.thumbnail.contentType);
    } catch (err) {
      thumbnailWarning = `サムネイル設定に失敗しました: ${err instanceof Error ? err.message : String(err)}`;
    }
  }

  return {
    videoId,
    broadcastId,
    streamId: stream.streamId,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    streamKey: stream.streamKey,
    ingestionAddress: stream.ingestionAddress,
    ...(thumbnailWarning !== undefined ? { thumbnailWarning } : {}),
  };
}
