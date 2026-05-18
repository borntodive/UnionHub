// Replace idXXXXXXXXXX with the actual App Store ID after first iOS submission.
export const IOS_APP_STORE_URL =
  "https://apps.apple.com/app/unionhub/idXXXXXXXXXX";

export function getAndroidApkUrl(version: string): string {
  return `https://unionhub.app/UnionHub_${version.replace(/\./g, "_")}.apk`;
}
