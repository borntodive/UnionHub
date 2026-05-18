import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { GradesService } from "./grades.service";
import { Grade } from "./entities/grade.entity";
import { Ruolo } from "../common/enums/ruolo.enum";

const mockGrade: Grade = {
  id: "uuid-1",
  codice: "CPT",
  nome: "Captain",
  ruolo: Ruolo.PILOT,
  users: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("GradesService", () => {
  let service: GradesService;
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
        GradesService,
        { provide: getRepositoryToken(Grade), useValue: mockRepo },
      ],
    }).compile();

    service = module.get<GradesService>(GradesService);
  });

  describe("update()", () => {
    it("throws NotFoundException when grade does not exist", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update("non-existent-id", { nome: "X" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("updates and returns grade when it exists", async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockGrade });
      mockRepo.findOne.mockResolvedValueOnce({ ...mockGrade }); // findById call
      const updated = { ...mockGrade, nome: "Senior Captain" };
      mockRepo.save.mockResolvedValue(updated);

      // findById returns grade, no duplicate codice change
      mockRepo.findOne
        .mockResolvedValueOnce({ ...mockGrade }) // findById inside update
        .mockResolvedValueOnce(null); // findByCodice (no duplicate)

      const result = await service.update("uuid-1", { nome: "Senior Captain" });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.nome).toBe("Senior Captain");
    });

    it("throws ConflictException when new codice already used by another grade", async () => {
      const existingOther: Grade = { ...mockGrade, id: "uuid-2", codice: "FO" };

      mockRepo.findOne
        .mockResolvedValueOnce({ ...mockGrade }) // findById
        .mockResolvedValueOnce(existingOther); // findByCodice → conflict

      await expect(service.update("uuid-1", { codice: "FO" })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("remove()", () => {
    it("throws NotFoundException when grade does not exist", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("non-existent-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("removes grade when it exists", async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockGrade });
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

    it("returns grade when found", async () => {
      mockRepo.findOne.mockResolvedValue({ ...mockGrade });
      const result = await service.findById("uuid-1");
      expect(result.id).toBe("uuid-1");
    });
  });
});
