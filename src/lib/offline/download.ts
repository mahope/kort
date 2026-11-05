import { OFFLINE_CONCURRENCY } from "./tiles";

interface FetchResult {
  stored: { url: string; bytes: number }[];
  failed: string[];
  rateLimited?: boolean;
}

export type WorkerSend = (message: Record<string, unknown>) => Promise<unknown>;

/** Send one message to the active service worker and await its reply. */
const sendToWorker: WorkerSend = async (message) => {
  if (!("serviceWorker" in navigator)) throw new Error("Service worker mangler");
  const reg = await navigator.serviceWorker.ready;
  const worker = reg.active;
  if (!worker) throw new Error("Service worker er ikke aktiv");
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timer = setTimeout(() => reject(new Error("Timeout")), 120000);
    channel.port1.onmessage = (e) => {
      clearTimeout(timer);
      if (e.data && e.data.error) reject(new Error(e.data.error));
      else resolve(e.data);
    };
    worker.postMessage(message, [channel.port2]);
  });
};

export interface DownloadProgress {
  done: number;
  failed: number;
  total: number;
  bytes: number;
}

export interface DownloadControl {
  /** Polled between batches: true cancels the run. */
  cancelled: () => boolean;
  /** Polled between batches: true holds the next batch until it turns false. */
  paused: () => boolean;
}

export interface DownloadResult extends DownloadProgress {
  storedUrls: string[];
  failedUrls: string[];
  cancelled: boolean;
  /** The server throttled us (429/503): the run stopped early. */
  rateLimited: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Download tiles through the service worker, one batch at a time so at most
 * OFFLINE_CONCURRENCY requests are ever in flight. Pause and cancel take
 * effect between batches.
 */
export async function downloadTiles(
  urls: string[],
  control: DownloadControl,
  onProgress: (p: DownloadProgress) => void,
  send: WorkerSend = sendToWorker,
  batchSize = OFFLINE_CONCURRENCY * 2
): Promise<DownloadResult> {
  const result: DownloadResult = {
    done: 0,
    failed: 0,
    total: urls.length,
    bytes: 0,
    storedUrls: [],
    failedUrls: [],
    cancelled: false,
    rateLimited: false,
  };
  for (let i = 0; i < urls.length; i += batchSize) {
    while (control.paused() && !control.cancelled()) await sleep(100);
    if (control.cancelled()) {
      result.cancelled = true;
      break;
    }
    const batch = urls.slice(i, i + batchSize);
    const reply = (await send({ type: "OFFLINE_FETCH", urls: batch })) as FetchResult;
    for (const s of reply.stored) {
      result.storedUrls.push(s.url);
      result.bytes += s.bytes;
    }
    result.failedUrls.push(...reply.failed);
    result.done = result.storedUrls.length;
    result.failed = result.failedUrls.length;
    onProgress({ done: result.done, failed: result.failed, total: result.total, bytes: result.bytes });
    if (reply.rateLimited) {
      result.rateLimited = true;
      // Batches never sent are missing too: count them, or the list lies.
      result.failedUrls.push(...urls.slice(i + batchSize));
      result.failed = result.failedUrls.length;
      onProgress({ done: result.done, failed: result.failed, total: result.total, bytes: result.bytes });
      break;
    }
  }
  return result;
}

export async function deleteTiles(
  urls: string[],
  send: WorkerSend = sendToWorker
): Promise<number> {
  let deleted = 0;
  for (let i = 0; i < urls.length; i += 2000) {
    const reply = (await send({ type: "OFFLINE_DELETE", urls: urls.slice(i, i + 2000) })) as {
      deleted: number;
    };
    deleted += reply.deleted;
  }
  return deleted;
}
