import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { aggregate, type StatEntry, type TestId, type TestStats } from "@/lib/diagnosis";

const STATS_DIR = path.join(process.cwd(), "data", "stats");
const MAX_ENTRIES = 200_000;

type StatsFile = { version: 1; entries: Record<string, StatEntry> };

function statsPath(testId: TestId) {
  return path.join(STATS_DIR, `${testId}.json`);
}

async function readStats(testId: TestId): Promise<StatsFile> {
  try {
    const parsed = JSON.parse(await readFile(statsPath(testId), "utf8")) as StatsFile;
    if (parsed?.version === 1 && parsed.entries && typeof parsed.entries === "object") return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  return { version: 1, entries: {} };
}

const queues = new Map<TestId, Promise<unknown>>();

function serialize<T>(testId: TestId, task: () => Promise<T>): Promise<T> {
  const run = (queues.get(testId) ?? Promise.resolve()).then(task, task);
  queues.set(testId, run.catch(() => undefined));
  return run;
}

export function saveEntry(testId: TestId, submissionId: string, entry: StatEntry) {
  return serialize(testId, async () => {
    const stats = await readStats(testId);
    const isNew = !(submissionId in stats.entries);
    if (isNew && Object.keys(stats.entries).length >= MAX_ENTRIES) return;
    stats.entries[submissionId] = entry;
    await mkdir(STATS_DIR, { recursive: true });
    const file = statsPath(testId);
    const temp = `${file}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(stats));
    await rename(temp, file);
  });
}

export function removeEntry(testId: TestId, submissionId: string) {
  return serialize(testId, async () => {
    const stats = await readStats(testId);
    if (!(submissionId in stats.entries)) return;
    delete stats.entries[submissionId];
    const file = statsPath(testId);
    const temp = `${file}.${process.pid}.tmp`;
    await writeFile(temp, JSON.stringify(stats));
    await rename(temp, file);
  });
}

export async function loadStats(testId: TestId): Promise<TestStats> {
  const stats = await serialize(testId, () => readStats(testId));
  return aggregate(testId, Object.values(stats.entries));
}
