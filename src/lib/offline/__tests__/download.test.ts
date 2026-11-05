import { describe, it, expect, vi } from "vitest";
import { downloadTiles, deleteTiles, type WorkerSend } from "../download";

const urls = Array.from({ length: 30 }, (_, i) => `https://api.dataforsyningen.dk/t/${i}`);

function mockWorker(failEvery = 0): { send: WorkerSend; calls: string[][] } {
  const calls: string[][] = [];
  const send: WorkerSend = async (m) => {
    const batch = m.urls as string[];
    calls.push(batch);
    if (m.type === "OFFLINE_DELETE") return { deleted: batch.length };
    const failed = batch.filter((_, i) => failEvery && i % failEvery === 0);
    return {
      stored: batch.filter((u) => !failed.includes(u)).map((url) => ({ url, bytes: 1000 })),
      failed,
    };
  };
  return { send, calls };
}

describe("downloadTiles", () => {
  it("fetches in batches of at most 12, reports progress and size", async () => {
    const { send, calls } = mockWorker();
    const onProgress = vi.fn();
    const res = await downloadTiles(urls, { cancelled: () => false, paused: () => false }, onProgress, send);
    expect(calls.every((c) => c.length <= 12)).toBe(true);
    expect(res).toMatchObject({ done: 30, failed: 0, bytes: 30000, cancelled: false });
    expect(onProgress).toHaveBeenLastCalledWith({ done: 30, failed: 0, total: 30, bytes: 30000 });
    expect(onProgress).toHaveBeenCalledTimes(3);
  });

  it("counts failed tiles", async () => {
    const { send } = mockWorker(4);
    const res = await downloadTiles(urls, { cancelled: () => false, paused: () => false }, () => {}, send);
    expect(res.failed).toBeGreaterThan(0);
    expect(res.done + res.failed).toBe(30);
  });

  it("stops between batches on cancel and keeps what was stored", async () => {
    const { send, calls } = mockWorker();
    let batches = 0;
    const res = await downloadTiles(
      urls,
      { cancelled: () => batches >= 1, paused: () => false },
      () => batches++,
      send
    );
    expect(res.cancelled).toBe(true);
    expect(calls.length).toBe(1);
    expect(res.storedUrls.length).toBe(12);
  });

  it("holds while paused and continues on resume", async () => {
    const { send, calls } = mockWorker();
    let paused = true;
    const run = downloadTiles(urls, { cancelled: () => false, paused: () => paused }, () => {}, send);
    await new Promise((r) => setTimeout(r, 250));
    expect(calls.length).toBe(0);
    paused = false;
    const res = await run;
    expect(res.done).toBe(30);
  });

  it("deletes in chunks", async () => {
    const { send, calls } = mockWorker();
    const many = Array.from({ length: 4500 }, (_, i) => `https://api.dataforsyningen.dk/t/${i}`);
    expect(await deleteTiles(many, send)).toBe(4500);
    expect(calls.map((c) => c.length)).toEqual([2000, 2000, 500]);
  });
});
