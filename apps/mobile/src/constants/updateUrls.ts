import { API_BASE_URL } from "../api/client";

export const IOS_APP_STORE_URL =
  "https://apps.apple.com/app/unionhub/id6767188690";

export function getAndroidApkUrl(releaseId: string): string {
  return `${API_BASE_URL}/app-releases/${releaseId}/download`;
}
