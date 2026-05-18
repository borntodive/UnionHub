import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { BasesService } from "./bases.service";
import { Base } from "./entities/base.entity";

const mockBase: Base = {
  id: "uuid-1",
  codice: "FCO",
  nome: "Roma Fiumicino",
  users: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("BasesService", () => {
  let service: BasesService;
  let mockRepo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BasesService,
        { provide: getRepositoryToken(Base), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<BasesService>(BasesService);
  });

  describe("update()", () => {
    it("throws NotFoundException when base does not exist", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update("non-existent-id", { nome: "X" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("updates and returns base when it exists", async () => {
      const updated = { ...mockBase, nome: "Roma Fiumicino Updated" };
      mockRepo.findOne.mockResolvedValueOnce({ ...mockBase }); // findById
      mockRepo.save.mockResolvedValue(updated);

      const result = await service.update("uuid-1", {
        nome: "Roma Fiumicino Updated",
      });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.nome).toBe("Roma Fiumicino Updated");
    });

    it("throws ConflictException when new codice already used by another base", async () => {
      const existingOther: Base = { ...mockBase, id: "uuid-2", codice: "MXP" };

      mockRepo.findOne
        .mockResolvedValueOnce({ ...mockBase }) // findById
        .mockResolvedValueOnce(existingOther); // findByCodice → conflict

      await expect(service.update("uuid-1", { codice: "MXP" })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("remove()", () => {
    it("throws NotFoundException when base does not exist", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("removes base when it exists", async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockBase });
      mockRepo.remove.mockResolvedValue(undefined);

      await service.remove("uuid-1");

      expect(mockRepo.remove).toHaveBeenCalledWith(
        expect.objectContaining({ id: "uuid-1" }),
      );
    });
  });

  describe("findById()", () => {
    it("throws NotFoundException when not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await expect(service.findById("missing")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("returns base when found", async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockBase });
      const result = await service.findById("uuid-1");
      expect(result.id).toBe("uuid-1");
    });
  });
});
