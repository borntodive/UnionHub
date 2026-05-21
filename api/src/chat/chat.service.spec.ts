import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { SendMessageDto } from "./dto/send-message.dto";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ChatService } from "./chat.service";
import { ChatMessage } from "./entities/chat-message.entity";
import { ChatAttachment } from "./entities/chat-attachment.entity";
import { User } from "../users/entities/user.entity";
import { Base } from "../bases/entities/base.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { UserRole } from "../common/enums/user-role.enum";
import { Ruolo } from "../common/enums/ruolo.enum";

const mockUser = (overrides: Partial<User> = {}): User =>
  ({
    id: "user-1",
    role: UserRole.USER,
    ruolo: Ruolo.PILOT,
    isActive: true,
    base: { id: "base-fco", nome: "FCO" } as Base,
    baseId: "base-fco",
    ...overrides,
  }) as unknown as User;

describe("ChatService.canAccessRoom", () => {
  let service: ChatService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(ChatMessage), useValue: {} },
        { provide: getRepositoryToken(ChatAttachment), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Base), useValue: {} },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    service = module.get(ChatService);
  });

  it("superadmin accesses any room", () => {
    const u = mockUser({ role: UserRole.SUPERADMIN, ruolo: null });
    expect(service.canAccessRoom(u, "pilot-generale")).toBe(true);
    expect(service.canAccessRoom(u, "cabin_crew-generale")).toBe(true);
    expect(service.canAccessRoom(u, "pilot-base-fco")).toBe(true);
  });

  it("pilot user accesses pilot-generale", () => {
    const u = mockUser({
      role: UserRole.USER,
      ruolo: Ruolo.PILOT,
      baseId: "base-fco",
    });
    expect(service.canAccessRoom(u, "pilot-generale")).toBe(true);
  });

  it("pilot user accesses own base room", () => {
    const u = mockUser({
      role: UserRole.USER,
      ruolo: Ruolo.PILOT,
      baseId: "base-fco",
    });
    expect(service.canAccessRoom(u, "pilot-base-fco")).toBe(true);
  });

  it("pilot user cannot access cabin crew room", () => {
    const u = mockUser({
      role: UserRole.USER,
      ruolo: Ruolo.PILOT,
      baseId: "base-fco",
    });
    expect(service.canAccessRoom(u, "cabin_crew-generale")).toBe(false);
  });

  it("pilot user cannot access other base room", () => {
    const u = mockUser({
      role: UserRole.USER,
      ruolo: Ruolo.PILOT,
      baseId: "base-fco",
    });
    expect(service.canAccessRoom(u, "pilot-base-mxp")).toBe(false);
  });

  it("pilot admin accesses all pilot rooms", () => {
    const u = mockUser({
      role: UserRole.ADMIN,
      ruolo: Ruolo.PILOT,
      baseId: null,
    });
    expect(service.canAccessRoom(u, "pilot-generale")).toBe(true);
    expect(service.canAccessRoom(u, "pilot-base-fco")).toBe(true);
    expect(service.canAccessRoom(u, "pilot-base-mxp")).toBe(true);
  });

  it("pilot admin cannot access cabin crew rooms", () => {
    const u = mockUser({
      role: UserRole.ADMIN,
      ruolo: Ruolo.PILOT,
      baseId: null,
    });
    expect(service.canAccessRoom(u, "cabin_crew-generale")).toBe(false);
  });

  it("user without ruolo accesses nothing", () => {
    const u = mockUser({ role: UserRole.USER, ruolo: null, baseId: null });
    expect(service.canAccessRoom(u, "pilot-generale")).toBe(false);
  });
});

describe("ChatService.saveMessage access", () => {
  let service: ChatService;

  beforeEach(async () => {
    const messageRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(() => {
        throw new Error("save should not be called");
      }),
    };
    const module = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: getRepositoryToken(ChatMessage), useValue: messageRepo },
        { provide: getRepositoryToken(ChatAttachment), useValue: {} },
        { provide: getRepositoryToken(User), useValue: {} },
        { provide: getRepositoryToken(Base), useValue: {} },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile();
    service = module.get(ChatService);
  });

  it("throws ForbiddenException when user cannot access room", async () => {
    const u = mockUser({
      role: UserRole.USER,
      ruolo: Ruolo.PILOT,
      baseId: "base-fco",
    });
    await expect(
      service.saveMessage(
        u as User,
        {
          roomId: "cabin_crew-generale",
          content: "hi",
        } as SendMessageDto,
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
