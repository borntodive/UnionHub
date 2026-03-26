import apiClient from "../../api/client";

export interface EmailSummary {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
  unread: boolean;
}

export interface EmailAttachment {
  attachmentId: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailDetail {
  id: string;
  threadId: string;
  from: string;
  subject: string;
  date: string;
  bodyHtml: string | null;
  bodyText: string | null;
  attachments: EmailAttachment[];
}

export interface EmailListResult {
  emails: EmailSummary[];
  nextPageToken?: string;
}

export const gmailApi = {
  listEmails: (pageToken?: string, ruolo?: string) =>
    apiClient.get<EmailListResult>("/gmail/inbox", {
      params: {
        ...(pageToken ? { pageToken } : {}),
        ...(ruolo ? { ruolo } : {}),
      },
    }),

  getEmail: (id: string, ruolo?: string) =>
    apiClient.get<EmailDetail>(`/gmail/inbox/${id}`, {
      params: ruolo ? { ruolo } : undefined,
    }),

  getAttachment: (messageId: string, attachmentId: string, ruolo?: string) =>
    apiClient.get<{ data: string; size: number }>(
      `/gmail/inbox/${messageId}/attachment`,
      { params: { attachmentId, ...(ruolo ? { ruolo } : {}) } },
    ),
};
