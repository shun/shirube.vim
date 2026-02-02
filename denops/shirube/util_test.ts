import { assertEquals, assertThrows } from "@std/assert";
import { generateCopyName, normalizeUrl, urlToPath } from "./util.ts";

Deno.test("normalizeUrl", async (t) => {
  await t.step("returns valid url", () => {
    assertEquals(normalizeUrl("shirube:///tmp"), "shirube:///tmp");
  });

  await t.step("throws error for invalid url", () => {
    assertThrows(() => normalizeUrl(123), Error, "invalid url");
    assertThrows(() => normalizeUrl(""), Error, "invalid url");
  });
});

Deno.test("urlToPath", async (t) => {
  await t.step("converts shirube url to path", () => {
    assertEquals(urlToPath("shirube:///tmp/foo"), "/tmp/foo");
  });

  await t.step("throws error for unsupported url", () => {
    assertThrows(() => urlToPath("file:///tmp/foo"), Error, "unsupported url");
  });
});

Deno.test("generateCopyName", async (t) => {
  await t.step("appends _copy suffix", () => {
    const original = "/tmp/foo.txt";
    const existing = new Set<string>();
    const expected = "/tmp/foo_copy.txt";
    assertEquals(generateCopyName(original, existing), expected);
  });

  await t.step("appends _copy suffix for directory", () => {
    const original = "/tmp/foo/";
    const existing = new Set<string>();
    const expected = "/tmp/foo_copy/";
    assertEquals(generateCopyName(original, existing), expected);
  });

  await t.step("increments number if exists", () => {
    const original = "/tmp/foo.txt";
    const existing = new Set<string>(["/tmp/foo_copy.txt"]);
    const expected = "/tmp/foo_copy_2.txt";
    assertEquals(generateCopyName(original, existing), expected);
  });

  await t.step("increments number if exists (dir)", () => {
    const original = "/tmp/foo/";
    const existing = new Set<string>(["/tmp/foo_copy/"]);
    const expected = "/tmp/foo_copy_2/";
    assertEquals(generateCopyName(original, existing), expected);
  });

  await t.step("handles basePath with trailing slash correctly (regression test)", () => {
    // This reproduces the bug where basePath calculation was incorrect
    const original = "/tmp/foo/AGENTS.md";
    const existing = new Set<string>();
    // If the bug exists, this might return something like "/tmp/foo/GENTS_copy.md"
    // depending on how it's called, but generateCopyName itself returns the full path.
    // The bug was in the caller (app.ts) slicing logic, but we should ensure
    // generateCopyName returns a predictable full path that app.ts can consume.
    const expected = "/tmp/foo/AGENTS_copy.md";
    assertEquals(generateCopyName(original, existing), expected);
  });
});
