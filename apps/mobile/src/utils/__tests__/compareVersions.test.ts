import { compareVersions } from "../compareVersions";

describe("compareVersions", () => {
  it("returns 1 when a is greater than b", () => {
    expect(compareVersions("1.0.7", "1.0.6")).toBe(1);
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
    expect(compareVersions("1.1.0", "1.0.99")).toBe(1);
  });

  it("returns -1 when a is less than b", () => {
    expect(compareVersions("1.0.5", "1.0.6")).toBe(-1);
    expect(compareVersions("0.9.9", "1.0.0")).toBe(-1);
  });

  it("returns 0 when versions are equal", () => {
    expect(compareVersions("1.0.6", "1.0.6")).toBe(0);
    expect(compareVersions("2.3.4", "2.3.4")).toBe(0);
  });
});
