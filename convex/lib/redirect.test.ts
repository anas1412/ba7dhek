import { describe, expect, test } from "vitest";
import { isAllowedRedirect } from "./redirect";

const DEV = "http://localhost:8081";

describe("isAllowedRedirect", () => {
  test("the phone app is always allowed", () => {
    expect(isAllowedRedirect("ba7dhek://", undefined)).toBe(true);
    expect(isAllowedRedirect("ba7dhek://?x=1", undefined)).toBe(true);
    expect(isAllowedRedirect("exp+ba7dhek://expo-development-client", undefined)).toBe(true);
  });

  test("with no development origin set, every web address is refused", () => {
    expect(isAllowedRedirect("http://localhost:8081", undefined)).toBe(false);
    expect(isAllowedRedirect("https://ba7dhek.tn", undefined)).toBe(false);
    expect(isAllowedRedirect("https://evil.example", "")).toBe(false);
  });

  test("the development origin is allowed, with or without a path", () => {
    expect(isAllowedRedirect("http://localhost:8081", DEV)).toBe(true);
    expect(isAllowedRedirect("http://localhost:8081/", DEV)).toBe(true);
    expect(isAllowedRedirect("http://localhost:8081/home?tab=1", DEV)).toBe(true);
    expect(isAllowedRedirect("http://localhost:8081?x=1", DEV)).toBe(true);
  });

  test("other sites are refused even when a development origin is set", () => {
    expect(isAllowedRedirect("https://evil.example", DEV)).toBe(false);
    expect(isAllowedRedirect("http://localhost:9999", DEV)).toBe(false);
    expect(isAllowedRedirect("https://localhost:8081", DEV)).toBe(false);
  });

  test("a host that only starts with the development origin is refused", () => {
    expect(isAllowedRedirect("http://localhost:8081.evil.example", DEV)).toBe(false);
    expect(isAllowedRedirect("http://localhost:80810", DEV)).toBe(false);
    expect(isAllowedRedirect("http://localhost:8081@evil.example", DEV)).toBe(false);
  });

  test("look-alike schemes are refused", () => {
    expect(isAllowedRedirect("ba7dhek.evil.example://", undefined)).toBe(false);
    expect(isAllowedRedirect("https://ba7dhek://", undefined)).toBe(false);
    expect(isAllowedRedirect("", undefined)).toBe(false);
  });
});
