import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotificationsService } from "./notifications.service";
import { DeviceToken } from "./entities/device-token.entity";

describe("NotificationsService.fireSilentBroadcast", () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(DeviceToken), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  it("calls broadcastSilent with the given type and swallows errors", async () => {
    const spy = jest
      .spyOn(service, "broadcastSilent")
      .mockRejectedValue(new Error("network error"));

    // Must not throw
    service.fireSilentBroadcast("CATEGORIES_UPDATED");

    // Give the promise a tick to resolve/reject
    await new Promise((r) => setImmediate(r));

    expect(spy).toHaveBeenCalledWith("CATEGORIES_UPDATED");
  });

  it("calls broadcastSilent and does not await (returns void synchronously)", () => {
    jest.spyOn(service, "broadcastSilent").mockResolvedValue(undefined);
    const result = service.fireSilentBroadcast("URGENCIES_UPDATED");
    expect(result).toBeUndefined();
  });
});

describe("NotificationsService.broadcastVersionNotification", () => {
  let service: NotificationsService;
  let mockRepo: any;

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(DeviceToken), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    jest
      .spyOn(service as any, "sendExpoNotifications")
      .mockResolvedValue(undefined);
  });

  it("filters tokens by platform when platform is not 'all'", async () => {
    mockRepo.find.mockResolvedValue([
      {
        token: "ExponentPushToken[ios-token]",
        platform: "ios",
        isActive: true,
      },
    ]);

    await service.broadcastVersionNotification({
      version: "1.0.7",
      minVersion: null,
      platform: "ios",
      releaseNotes: "Bug fixes",
    });

    expect(mockRepo.find).toHaveBeenCalledWith({
      where: { isActive: true, platform: "ios" },
    });
  });

  it("sends to all tokens when platform is 'all'", async () => {
    mockRepo.find.mockResolvedValue([
      {
        token: "ExponentPushToken[ios-token]",
        platform: "ios",
        isActive: true,
      },
      {
        token: "ExponentPushToken[android-token]",
        platform: "android",
        isActive: true,
      },
    ]);

    await service.broadcastVersionNotification({
      version: "1.0.7",
      minVersion: null,
      platform: "all",
      releaseNotes: null,
    });

    expect(mockRepo.find).toHaveBeenCalledWith({ where: { isActive: true } });
  });
});
