import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { ContractsService } from "./contracts.service";
import { Contract } from "./entities/contract.entity";

const mockContract: Contract = {
  id: "uuid-1",
  codice: "B738",
  nome: "Boeing 737-800",
  users: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("ContractsService", () => {
  let service: ContractsService;
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
        ContractsService,
        { provide: getRepositoryToken(Contract), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<ContractsService>(ContractsService);
  });

  describe("update()", () => {
    it("throws NotFoundException when contract does not exist", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update("non-existent-id", { nome: "X" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("updates and returns contract when it exists", async () => {
      const updated = { ...mockContract, nome: "Boeing 737-800 Updated" };
      mockRepo.findOne.mockResolvedValueOnce({ ...mockContract }); // findById
      mockRepo.save.mockResolvedValue(updated);

      const result = await service.update("uuid-1", {
        nome: "Boeing 737-800 Updated",
      });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.nome).toBe("Boeing 737-800 Updated");
    });

    it("throws ConflictException when new codice already used by another contract", async () => {
      const existingOther: Contract = {
        ...mockContract,
        id: "uuid-2",
        codice: "A320",
      };

      mockRepo.findOne
        .mockResolvedValueOnce({ ...mockContract }) // findById
        .mockResolvedValueOnce(existingOther); // findByCodice → conflict

      await expect(
        service.update("uuid-1", { codice: "A320" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("remove()", () => {
    it("throws NotFoundException when contract does not exist", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("removes contract when it exists", async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockContract });
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

    it("returns contract when found", async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockContract });
      const result = await service.findById("uuid-1");
      expect(result.id).toBe("uuid-1");
    });
  });
});
