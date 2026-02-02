import { assertEquals } from "@std/assert";
import { parseBuffer } from "./parser.ts";
import type { BufferState, Entry } from "../types.ts";
import { createLocalAdapter } from "../adapter/local.ts";

const mockState = (url: string, entries: Entry[] = []): BufferState => {
  const entryMap = new Map<number, Entry>();
  for (const e of entries) {
    entryMap.set(e.id, e);
  }
  return {
    bufnr: 1,
    url,
    adapter: createLocalAdapter(), // Mock behavior if needed, but parser doesn't use adapter
    entries: entryMap,
    nextId: 100,
    meta: { size: false, permissions: false },
  };
};

Deno.test("parseBuffer", async (t) => {
  const url = "shirube:///tmp/test"; // maps to /tmp/test

  await t.step("parses existing entries", () => {
    const entries: Entry[] = [
      { id: 1, name: "foo", isDirectory: false, path: "/tmp/test/foo", meta: {} },
      { id: 2, name: "bar", isDirectory: true, path: "/tmp/test/bar", meta: {} },
    ];
    const state = mockState(url, entries);
    const lines = [
      "/1 foo",
      "/2 bar/",
    ];
    const result = parseBuffer(lines, state);

    assertEquals(result.errors, []);
    assertEquals(result.existing.get(1), "/tmp/test/foo");
    assertEquals(result.existing.get(2), "/tmp/test/bar");
    assertEquals(result.created.length, 0);
  });

  await t.step("parses new creations", () => {
    const state = mockState(url);
    const lines = [
      "newfile",
      "newdir/",
    ];
    const result = parseBuffer(lines, state);

    assertEquals(result.errors, []);
    assertEquals(result.created, [
      { path: "/tmp/test/newfile", entryType: "file" },
      { path: "/tmp/test/newdir", entryType: "directory" },
    ]);
  });

  await t.step("detects rename (existing id, new name)", () => {
    const entries: Entry[] = [
      { id: 1, name: "foo", isDirectory: false, path: "/tmp/test/foo", meta: {} },
    ];
    const state = mockState(url, entries);
    const lines = [
      "/1 baz",
    ];
    const result = parseBuffer(lines, state);

    assertEquals(result.errors, []);
    // existing map contains the *new* path for the ID
    assertEquals(result.existing.get(1), "/tmp/test/baz");
  });

  await t.step("detects duplication (same id multiple times)", () => {
    const entries: Entry[] = [
      { id: 1, name: "foo", isDirectory: false, path: "/tmp/test/foo", meta: {} },
    ];
    const state = mockState(url, entries);
    const lines = [
      "/1 foo",
      "/1 foo_copy",
    ];
    const result = parseBuffer(lines, state);

    assertEquals(result.errors, []);
    assertEquals(result.existing.get(1), "/tmp/test/foo");
    assertEquals(result.duplicated.get(1), ["/tmp/test/foo_copy"]);
  });

  await t.step("reports error for unknown id", () => {
    const state = mockState(url);
    const lines = ["/999 unknown"];
    const result = parseBuffer(lines, state);
    assertEquals(result.errors, ["unknown id: 999"]);
  });

  await t.step("reports error for invalid id format", () => {
    // The regex /^\/(\d+) (.*)$/ won't match "/abc invalid"
    // So it falls back to create logic.
    // "abc invalid" -> file creation check
    // Wait, regex expects digits. So "/abc" is not treated as ID line.
    // It's treated as a new file name: "/abc invalid"

    // Let's test empty name for ID
    const entries: Entry[] = [
      { id: 1, name: "foo", isDirectory: false, path: "/tmp/test/foo", meta: {} },
    ];
    const state2 = mockState(url, entries);
    const lines2 = ["/1 "]; // empty name
    const result = parseBuffer(lines2, state2);
    assertEquals(result.errors, ["empty name for id: 1"]);
  });
});
