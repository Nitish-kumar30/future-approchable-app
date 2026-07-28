import { describe, it, expect } from "vitest";
import { buildLoginUrl, getSafeNextPath, DEFAULT_POST_LOGIN_PATH, LOGIN_PATH, courseDetailPath } from "./authRedirect";

describe("getSafeNextPath", () => {
  it("returns default when missing or empty", () => {
    expect(getSafeNextPath(null)).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getSafeNextPath(undefined)).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getSafeNextPath("")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getSafeNextPath("   ")).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("allows internal paths with query strings", () => {
    expect(getSafeNextPath("/courses/foo")).toBe("/courses/foo");
    expect(getSafeNextPath("/courses/foo?ref=share")).toBe("/courses/foo?ref=share");
    expect(getSafeNextPath("%2Fcourses%2Ffoo%3Fref%3Dshare")).toBe("/courses/foo?ref=share");
  });

  it("rejects external and protocol-relative URLs", () => {
    expect(getSafeNextPath("https://evil.com")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getSafeNextPath("//evil.com")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getSafeNextPath("javascript:alert(1)")).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("rejects auth loop paths", () => {
    expect(getSafeNextPath("/")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getSafeNextPath("/login")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getSafeNextPath("/login?next=/dashboard")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getSafeNextPath("/auth")).toBe(DEFAULT_POST_LOGIN_PATH);
    expect(getSafeNextPath("/auth?tab=signup")).toBe(DEFAULT_POST_LOGIN_PATH);
  });

  it("rejects malformed encoding", () => {
    expect(getSafeNextPath("%")).toBe(DEFAULT_POST_LOGIN_PATH);
  });
});

describe("buildLoginUrl", () => {
  it("builds login url with encoded next", () => {
    expect(buildLoginUrl("/courses/foo?ref=1")).toBe(
      `${LOGIN_PATH}?next=${encodeURIComponent("/courses/foo?ref=1")}`,
    );
    expect(buildLoginUrl(courseDetailPath("ai-mastery"))).toBe(
      `${LOGIN_PATH}?next=${encodeURIComponent("/courses/ai-mastery")}`,
    );
  });

  it("supports extra query params such as tab=signup", () => {
    expect(buildLoginUrl("/on-demand/foo", { tab: "signup" })).toBe(
      `${LOGIN_PATH}?tab=signup&next=${encodeURIComponent("/on-demand/foo")}`,
    );
  });

  it("returns bare login path for auth routes", () => {
    expect(buildLoginUrl("/login")).toBe(LOGIN_PATH);
    expect(buildLoginUrl("/auth")).toBe(LOGIN_PATH);
    expect(buildLoginUrl("/")).toBe(LOGIN_PATH);
  });
});
