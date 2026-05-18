import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AppReleasesService } from "./app-releases.service";
import { AppRelease } from "./entities/app-release.entity";
import { NotificationsService } from "../notifications/notifications.service";

describe("AppReleasesService", () => {
  let service: AppReleasesService;
  let mockRepo: any;
  let mockNotifications: any;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    mockNotifications = {
      broadcastVersionNotification: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppReleasesService,
        { provide: getRepositoryToken(AppRelease), useValue: mockRepo },
        { provide: NotificationsService, useValue: mockNotifications },
      ],
    }).compile();

    service = module.get<AppReleasesService>(AppReleasesService);
  });

  describe("create", () => {
    it("saves the release and triggers push notification", async () => {
      const dto = { version: "1.0.7", platform: "all" };
      const saved = {
        id: "uuid-1",
        ...dto,
        minVersion: null,
        releaseNotes: null,
        createdAt: new Date(),
      };
      mockRepo.create.mockReturnValue(saved);
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.create(dto as any);

      expect(mockRepo.save).toHaveBeenCalled();
      expect(
        mockNotifications.broadcastVersionNotification,
      ).toHaveBeenCalledWith({
        version: "1.0.7",
        minVersion: undefined,
        platform: "all",
        releaseNotes: undefined,
      });
      expect(result).toEqual(saved);
    });
  });

  describe("getLatest", () => {
    it("returns the latest release matching platform or all", async () => {
      const release = { id: "uuid-1", version: "1.0.7", platform: "all" };
      mockRepo.findOne.mockResolvedValue(release);

      const result = await service.getLatest("ios");

      expect(mockRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ order: { createdAt: "DESC" } }),
      );
      expect(result).toEqual(release);
    });

    it("returns null when no release exists", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const result = await service.getLatest("android");
      expect(result).toBeNull();
    });
  });
});
