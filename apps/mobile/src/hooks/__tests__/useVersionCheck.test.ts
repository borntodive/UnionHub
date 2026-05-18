import { compareVersions } from "../../utils/compareVersions";

// Logic extracted from useVersionCheck for unit testing
function computeNativeUpdate(
  currentVersion: string,
  release: {
    version: string;
    minVersion: string | null;
    releaseNotes: string | null;
  },
) {
  const isOutdated = compareVersions(currentVersion, release.version) < 0;
  if (!isOutdated) return null;

  const isForced =
    !!release.minVersion &&
    compareVersions(currentVersion, release.minVersion) < 0;

  return {
    latestVersion: release.version,
    minVersion: release.minVersion,
    releaseNotes: release.releaseNotes,
    isForced,
  };
}

describe("useVersionCheck logic", () => {
  it("returns null when current version is up-to-date", () => {
    const result = computeNativeUpdate("1.0.6", {
      version: "1.0.6",
      minVersion: null,
      releaseNotes: null,
    });
    expect(result).toBeNull();
  });

  it("returns update info when current version is outdated", () => {
    const result = computeNativeUpdate("1.0.5", {
      version: "1.0.6",
      minVersion: null,
      releaseNotes: "Bug fixes",
    });
    expect(result).not.toBeNull();
    expect(result?.latestVersion).toBe("1.0.6");
    expect(result?.isForced).toBe(false);
  });

  it("sets isForced true when current version is below minVersion", () => {
    const result = computeNativeUpdate("1.0.4", {
      version: "1.0.6",
      minVersion: "1.0.5",
      releaseNotes: null,
    });
    expect(result?.isForced).toBe(true);
  });

  it("sets isForced false when current version meets minVersion", () => {
    const result = computeNativeUpdate("1.0.5", {
      version: "1.0.6",
      minVersion: "1.0.5",
      releaseNotes: null,
    });
    expect(result?.isForced).toBe(false);
  });
});
