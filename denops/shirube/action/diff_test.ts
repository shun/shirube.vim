import { assertEquals } from "@std/assert";
import { buildActions } from "./diff.ts";
import type { BufferState, Entry } from "../types.ts";
import { createLocalAdapter } from "../adapter/local.ts";
import type { ParseResult } from "./parser.ts";

const mockState = (entries: Entry[] = []): BufferState => {
  const entryMap = new Map<number, Entry>();
  for (const e of entries) {
    entryMap.set(e.id, e);
  }
  return {
    bufnr: 1,
    url: "shirube:///tmp/test",
    adapter: createLocalAdapter(),
    entries: entryMap,
    nextId: 100,
    meta: { size: false, permissions: false },
  };
};

const mockParseResult = (
  existing: [number, string][] = [],
  created: { path: string; entryType: "file" | "directory" }[] = [],
  duplicated: [number, string[]][] = [],
  errors: string[] = [],
): ParseResult => {
  return {
    existing: new Map(existing),
    created,
    duplicated: new Map(duplicated),
    errors,
  };
};

Deno.test("buildActions", async (t) => {
  await t.step("generates no actions logic when nothing changes", () => {
    const entries: Entry[] = [
      { id: 1, name: "foo", isDirectory: false, path: "/tmp/test/foo", meta: {} },
    ];
    const state = mockState(entries);
    const parsed = mockParseResult([[1, "/tmp/test/foo"]]);

    const result = buildActions(state, parsed);
    assertEquals(result.errors, []);
    assertEquals(result.actions, []);
  });

  await t.step("generates move action when path changes", () => {
    const entries: Entry[] = [
      { id: 1, name: "foo", isDirectory: false, path: "/tmp/test/foo", meta: {} },
    ];
    const state = mockState(entries);
    // User changed name to "bar" -> path becomes /tmp/test/bar
    const parsed = mockParseResult([[1, "/tmp/test/bar"]]);

    const result = buildActions(state, parsed);
    assertEquals(result.errors, []);
    assertEquals(result.actions.length, 1);
    assertEquals(result.actions[0], {
      type: "move",
      entryType: "file",
      src: "/tmp/test/foo",
      dest: "/tmp/test/bar",
    });
  });

  await t.step("generates create action", () => {
    const state = mockState([]);
    const parsed = mockParseResult([], [{ path: "/tmp/test/new", entryType: "file" }]);

    const result = buildActions(state, parsed);
    assertEquals(result.errors, []);
    assertEquals(result.actions.length, 1);
    assertEquals(result.actions[0], {
      type: "create",
      entryType: "file",
      dest: "/tmp/test/new",
    });
  });

  await t.step("generates delete action when id is missing", () => {
    const entries: Entry[] = [
      { id: 1, name: "foo", isDirectory: false, path: "/tmp/test/foo", meta: {} },
    ];
    const state = mockState(entries);
    const parsed = mockParseResult([]); // Empty existing map

    const result = buildActions(state, parsed);
    assertEquals(result.errors, []);
    assertEquals(result.actions.length, 1);
    assertEquals(result.actions[0], {
      type: "delete",
      entryType: "file",
      src: "/tmp/test/foo",
    });
  });

  await t.step("generates copy action", () => {
    const entries: Entry[] = [
      { id: 1, name: "foo", isDirectory: false, path: "/tmp/test/foo", meta: {} },
    ];
    const state = mockState(entries);
    // Original still exists + duplicate
    const parsed = mockParseResult(
      [[1, "/tmp/test/foo"]],
      [],
      [[1, ["/tmp/test/foo_copy"]]],
    );

    const result = buildActions(state, parsed);
    assertEquals(result.errors, []);
    assertEquals(result.actions.length, 1);
    assertEquals(result.actions[0], {
      type: "copy",
      entryType: "file",
      src: "/tmp/test/foo",
      dest: "/tmp/test/foo_copy",
    });
  });

  await t.step("sorts actions appropriately", () => {
    // create dir should be first, delete dir should be last etc.
    // Logic in diff.ts:
    // create dir (0) < move (1) < copy (2) < create file (3) < delete file (4) < delete dir (5)

    // Let's try to mix them
    const entries: Entry[] = [
      { id: 1, name: "ToDel", isDirectory: true, path: "/path/ToDel", meta: {} },
      { id: 2, name: "ToMov", isDirectory: false, path: "/path/ToMov", meta: {} },
    ];
    const state = mockState(entries);

    // 1 is deleted (not in existing)
    // 2 is moved
    // new dir is created
    const parsed = mockParseResult(
      [[2, "/path/Moved"]],
      [{ path: "/path/NewDir", entryType: "directory" }],
    );

    const result = buildActions(state, parsed);
    // Expected order:
    // 1. Create Directory (NewDir)
    // 2. Move File (ToMov -> Moved)
    // 3. Delete Directory (ToDel)

    assertEquals(result.actions.length, 3);
    assertEquals(result.actions[0].type, "create");
    assertEquals(result.actions[0].dest, "/path/NewDir");

    assertEquals(result.actions[1].type, "move");

    assertEquals(result.actions[2].type, "delete");
    assertEquals(result.actions[2].src, "/path/ToDel");
  });
});
