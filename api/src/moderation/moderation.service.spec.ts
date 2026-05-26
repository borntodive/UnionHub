import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ModerationService } from "./moderation.service";
import { AiService } from "../ai/ai.service";
import { User } from "../users/entities/user.entity";

const mockAiService = {
  generate: jest.fn(),
};

const mockUsersRepo = {
  findOne: jest.fn(),
};

describe("ModerationService.classifyMessage", () => {
  let service: ModerationService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        { provide: AiService, useValue: mockAiService },
        {
          provide: JwtService,
          useValue: { sign: jest.fn().mockReturnValue("fake-token") },
        },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue("secret") },
        },
        { provide: getRepositoryToken(User), useValue: mockUsersRepo },
      ],
    }).compile();
    service = module.get(ModerationService);
    // Set botUserId as if onModuleInit ran
    (service as any).botUserId = "bot-id-123";
  });

  it("returns null when sender is the bot (loop guard)", async () => {
    const msg = {
      sender: { id: "bot-id-123" },
      content: "test",
      roomId: "pilot-generale",
    };
    const result = await service.classifyMessage(msg as any);
    expect(result).toBeNull();
    expect(mockAiService.generate).not.toHaveBeenCalled();
  });

  it("returns null when content is null (attachment-only message)", async () => {
    const msg = {
      sender: { id: "user-abc" },
      content: null,
      roomId: "pilot-generale",
    };
    const result = await service.classifyMessage(msg as any);
    expect(result).toBeNull();
    expect(mockAiService.generate).not.toHaveBeenCalled();
  });

  it("returns null when content is empty string", async () => {
    const msg = {
      sender: { id: "user-abc" },
      content: "  ",
      roomId: "pilot-generale",
    };
    const result = await service.classifyMessage(msg as any);
    expect(result).toBeNull();
    expect(mockAiService.generate).not.toHaveBeenCalled();
  });

  it("returns null when AI responds OK", async () => {
    mockAiService.generate.mockResolvedValue("OK");
    const msg = {
      sender: { id: "user-abc" },
      content: "Ciao a tutti",
      roomId: "pilot-generale",
    };
    const result = await service.classifyMessage(msg as any);
    expect(result).toBeNull();
    expect(mockAiService.generate).toHaveBeenCalledWith(
      "Ciao a tutti",
      expect.stringContaining("moderatore automatico"),
      undefined,
    );
  });

  it("returns the reason when AI responds FLAG", async () => {
    mockAiService.generate.mockResolvedValue(
      "FLAG: linguaggio offensivo rilevato",
    );
    const msg = {
      sender: { id: "user-abc" },
      content: "insulto pesante",
      roomId: "pilot-generale",
    };
    const result = await service.classifyMessage(msg as any);
    expect(result).toBe("linguaggio offensivo rilevato");
  });

  it("returns null and logs error when AI call throws", async () => {
    mockAiService.generate.mockRejectedValue(new Error("timeout"));
    const msg = {
      sender: { id: "user-abc" },
      content: "messaggio normale",
      roomId: "pilot-generale",
    };
    const result = await service.classifyMessage(msg as any);
    expect(result).toBeNull();
  });
});
