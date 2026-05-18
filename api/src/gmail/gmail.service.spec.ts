import { Test } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { GmailService } from "./gmail.service";
import { User } from "../users/entities/user.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { UserRole } from "../common/enums/user-role.enum";
import { Ruolo } from "../common/enums/ruolo.enum";

const mockLock = { release: jest.fn() };
const mockClient = {
  connect: jest.fn().mockResolvedValue(undefined),
  logout: jest.fn().mockResolvedValue(undefined),
  getMailboxLock: jest.fn().mockResolvedValue(mockLock),
  search: jest.fn(),
  fetchOne: jest.fn(),
};
jest.mock("imapflow", () => ({
  ImapFlow: jest.fn().mockImplementation(() => mockClient),
}));
jest.mock("mailparser", () => ({
  simpleParser: jest.fn(),
}));

import { simpleParser } from "mailparser";

describe("GmailService", () => {
  let service: GmailService;
  const rsaUser: Partial<User> = {
    id: "user-1",
    role: UserRole.USER,
    rsa: true,
    mailboxAccess: true,
    ruolo: Ruolo.PILOT,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        GmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const map: Record<string, string> = {
                GMAIL_USER_PILOT: "pilot@example.com",
                GMAIL_USER_CABIN_CREW: "cc@example.com",
                MAIL_PASS: "app-pass-pilot",
                GMAIL_APP_PASSWORD_CABIN_CREW: "app-pass-cc",
              };
              return map[key];
            }),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn().mockResolvedValue(rsaUser),
          },
        },
        {
          provide: NotificationsService,
          useValue: { broadcastSilent: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(GmailService);
  });

  describe("listEmails", () => {
    it("connects, acquires lock, releases lock, and logs out", async () => {
      mockClient.search.mockResolvedValue([]);
      await service.listEmails("user-1");
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.getMailboxLock).toHaveBeenCalledWith("INBOX");
      expect(mockLock.release).toHaveBeenCalledTimes(1);
      expect(mockClient.logout).toHaveBeenCalledTimes(1);
    });

    it("returns first page of emails sorted newest first", async () => {
      mockClient.search.mockResolvedValue([1, 2, 3]);
      mockClient.fetchOne.mockResolvedValue({
        envelope: {
          from: [{ name: "Alice", address: "alice@example.com" }],
          subject: "Hello",
          date: new Date("2026-01-01T10:00:00Z"),
        },
        flags: new Set<string>(),
      });
      const result = await service.listEmails("user-1");
      expect(result.emails).toHaveLength(3);
      expect(result.emails[0].from).toBe("Alice <alice@example.com>");
      expect(result.emails[0].unread).toBe(true);
      expect(result.nextPageToken).toBeUndefined();
    });

    it("returns nextPageToken when more results exist", async () => {
      mockClient.search.mockResolvedValue(
        Array.from({ length: 25 }, (_, i) => i + 1),
      );
      mockClient.fetchOne.mockResolvedValue({
        envelope: {
          from: [{ address: "a@b.com" }],
          subject: "X",
          date: new Date(),
        },
        flags: new Set<string>(["\\Seen"]),
      });
      const result = await service.listEmails("user-1");
      expect(result.emails).toHaveLength(20);
      expect(result.nextPageToken).toBe("2");
    });
  });

  describe("getEmail", () => {
    it("connects, acquires lock, releases lock, and logs out", async () => {
      mockClient.fetchOne.mockResolvedValue({ source: Buffer.from("raw") });
      (simpleParser as jest.Mock).mockResolvedValue({
        from: { text: "a@b.com" },
        subject: "S",
        date: new Date(),
        html: null,
        text: "t",
        attachments: [],
      });
      await service.getEmail("user-1", "42");
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.getMailboxLock).toHaveBeenCalledWith("INBOX");
      expect(mockLock.release).toHaveBeenCalledTimes(1);
      expect(mockClient.logout).toHaveBeenCalledTimes(1);
    });

    it("parses source email and returns structured detail", async () => {
      mockClient.fetchOne.mockResolvedValue({ source: Buffer.from("raw") });
      (simpleParser as jest.Mock).mockResolvedValue({
        from: { text: "Alice <alice@example.com>" },
        subject: "Test",
        date: new Date("2026-01-01T10:00:00Z"),
        html: "<p>Hello</p>",
        text: "Hello",
        attachments: [
          {
            filename: "doc.pdf",
            contentType: "application/pdf",
            size: 1024,
            content: Buffer.alloc(1024),
          },
        ],
      });
      const result = await service.getEmail("user-1", "42");
      expect(result.id).toBe("42");
      expect(result.bodyHtml).toBe("<p>Hello</p>");
      expect(result.attachments).toHaveLength(1);
      expect(result.attachments[0].attachmentId).toBe("0");
      expect(result.attachments[0].filename).toBe("doc.pdf");
    });
  });

  describe("getAttachment", () => {
    it("connects, acquires lock, releases lock, and logs out", async () => {
      const content = Buffer.from("x");
      mockClient.fetchOne.mockResolvedValue({ source: Buffer.from("raw") });
      (simpleParser as jest.Mock).mockResolvedValue({
        attachments: [{ content, size: content.length }],
      });
      await service.getAttachment("user-1", "42", "0");
      expect(mockClient.connect).toHaveBeenCalledTimes(1);
      expect(mockClient.getMailboxLock).toHaveBeenCalledWith("INBOX");
      expect(mockLock.release).toHaveBeenCalledTimes(1);
      expect(mockClient.logout).toHaveBeenCalledTimes(1);
    });

    it("returns base64-encoded attachment content", async () => {
      const content = Buffer.from("PDF content");
      mockClient.fetchOne.mockResolvedValue({ source: Buffer.from("raw") });
      (simpleParser as jest.Mock).mockResolvedValue({
        attachments: [{ content, size: content.length }],
      });
      const result = await service.getAttachment("user-1", "42", "0");
      expect(result.data).toBe(content.toString("base64"));
      expect(result.size).toBe(content.length);
    });
  });
});
