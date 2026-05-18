import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotificationsService } from "./notifications.service";
import { DeviceToken } from "./entities/device-token.entity";

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
