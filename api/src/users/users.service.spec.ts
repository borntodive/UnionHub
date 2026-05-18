import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ForbiddenException } from "@nestjs/common";
import { Brackets } from "typeorm";
import { UsersService } from "./users.service";
import { User } from "./entities/user.entity";
import {
  UserStatusHistory,
  StatusChangeType,
} from "./entities/user-status-history.entity";
import { UserRole } from "../common/enums/user-role.enum";
import { Ruolo } from "../common/enums/ruolo.enum";
import { MailService } from "../mail/mail.service";
import { PdfService } from "../documents/pdf.service";
import { NotificationsService } from "../notifications/notifications.service";
import { BasesService } from "../bases/bases.service";
import { GradesService } from "../grades/grades.service";
import { FileStorageService } from "./services/file-storage.service";

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: "user-uuid",
    crewcode: "CPT0001",
    nome: "Mario",
    cognome: "Rossi",
    email: "mario@example.com",
    telefono: null,
    password: "hashed",
    role: UserRole.USER,
    ruolo: Ruolo.PILOT,
    isActive: true,
    mustChangePassword: false,
    statusLog: [],
    statusHistory: [],
    ...overrides,
  }) as unknown as User;

describe("UsersService — status history logging", () => {
  let service: UsersService;
  let usersRepo: { findOne: jest.Mock; save: jest.Mock };
  let statusHistoryRepo: {
    save: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    usersRepo = { findOne: jest.fn(), save: jest.fn() };
    statusHistoryRepo = {
      save: jest.fn().mockResolvedValue({}),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        {
          provide: getRepositoryToken(UserStatusHistory),
          useValue: statusHistoryRepo,
        },
        { provide: MailService, useValue: { sendWelcomeEmail: jest.fn() } },
        { provide: PdfService, useValue: {} },
        {
          provide: NotificationsService,
          useValue: {
            sendPushNotification: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: BasesService, useValue: {} },
        { provide: GradesService, useValue: {} },
        {
          provide: FileStorageService,
          useValue: { moveFromBulkimport: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe("remove() — deactivate user", () => {
    it("saves DEACTIVATION history entry with correct fields", async () => {
      const user = makeUser({ id: "user-uuid", role: UserRole.USER });
      const admin = makeUser({
        id: "admin-uuid",
        role: UserRole.SUPERADMIN,
        ruolo: Ruolo.PILOT,
      });

      usersRepo.findOne.mockResolvedValue(user);
      usersRepo.save.mockResolvedValue({ ...user, isActive: false });

      await service.remove("user-uuid", admin);

      expect(statusHistoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-uuid",
          changeType: StatusChangeType.DEACTIVATION,
          changedById: "admin-uuid",
        }),
      );
    });

    it("throws ForbiddenException when admin tries to remove user of different ruolo", async () => {
      const user = makeUser({ ruolo: Ruolo.CABIN_CREW, role: UserRole.USER });
      const admin = makeUser({
        id: "admin-uuid",
        role: UserRole.ADMIN,
        ruolo: Ruolo.PILOT,
      });

      usersRepo.findOne.mockResolvedValue(user);

      await expect(service.remove("user-uuid", admin)).rejects.toThrow(
        ForbiddenException,
      );
      expect(statusHistoryRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("selfDeactivate()", () => {
    it("saves DEACTIVATION history where changedById equals the user's own id", async () => {
      const user = makeUser({ id: "user-uuid", isActive: true });

      usersRepo.findOne.mockResolvedValue(user);
      usersRepo.save.mockResolvedValue({ ...user, isActive: false });

      await service.selfDeactivate("user-uuid");

      expect(statusHistoryRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "user-uuid",
          changeType: StatusChangeType.DEACTIVATION,
          changedById: "user-uuid",
        }),
      );
    });

    it("does nothing when user is already inactive", async () => {
      const user = makeUser({ id: "user-uuid", isActive: false });
      usersRepo.findOne.mockResolvedValue(user);

      await service.selfDeactivate("user-uuid");

      expect(statusHistoryRepo.save).not.toHaveBeenCalled();
    });
  });
});

describe("UsersService — search brackets", () => {
  let service: UsersService;
  let mockQb: {
    leftJoinAndSelect: jest.Mock;
    where: jest.Mock;
    andWhere: jest.Mock;
    orderBy: jest.Mock;
    addOrderBy: jest.Mock;
    skip: jest.Mock;
    take: jest.Mock;
    getManyAndCount: jest.Mock;
    getOne: jest.Mock;
  };
  let usersRepo: {
    createQueryBuilder: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  let statusHistoryRepo: {
    save: jest.Mock;
    find: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(async () => {
    mockQb = {
      leftJoinAndSelect: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      orderBy: jest.fn(),
      addOrderBy: jest.fn(),
      skip: jest.fn(),
      take: jest.fn(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      getOne: jest.fn().mockResolvedValue(null),
    };
    // All chainable methods return the same mock QB
    (Object.keys(mockQb) as Array<keyof typeof mockQb>).forEach((key) => {
      if (key !== "getManyAndCount") {
        mockQb[key].mockReturnValue(mockQb);
      }
    });

    usersRepo = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
      findOne: jest.fn(),
      save: jest.fn(),
      create: jest.fn().mockImplementation((x) => x),
      update: jest.fn().mockResolvedValue(undefined),
    };
    statusHistoryRepo = {
      save: jest.fn().mockResolvedValue({}),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: usersRepo },
        {
          provide: getRepositoryToken(UserStatusHistory),
          useValue: statusHistoryRepo,
        },
        { provide: MailService, useValue: {} },
        { provide: PdfService, useValue: {} },
        {
          provide: NotificationsService,
          useValue: {
            sendPushNotification: jest.fn().mockResolvedValue(undefined),
          },
        },
        { provide: BasesService, useValue: {} },
        { provide: GradesService, useValue: {} },
        { provide: FileStorageService, useValue: {} },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  const superAdmin = makeUser({
    id: "sa-uuid",
    role: UserRole.SUPERADMIN,
    ruolo: undefined,
  });

  const expectBaseJoins = () => {
    expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith("user.base", "base");
    expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith(
      "user.contratto",
      "contratto",
    );
    expect(mockQb.leftJoinAndSelect).toHaveBeenCalledWith(
      "user.grade",
      "grade",
    );
  };

  describe("findAll()", () => {
    it("calls andWhere with Brackets when search is provided", async () => {
      await service.findAll({ search: "mario" }, superAdmin);

      const bracketsCall = mockQb.andWhere.mock.calls.find(
        ([arg]) => arg instanceof Brackets,
      );
      expect(bracketsCall).toBeDefined();
    });

    it("does not add Brackets andWhere when search is absent", async () => {
      await service.findAll({}, superAdmin);

      const bracketsCall = mockQb.andWhere.mock.calls.find(
        ([arg]) => arg instanceof Brackets,
      );
      expect(bracketsCall).toBeUndefined();
    });

    it("applies base/contratto/grade joins", async () => {
      await service.findAll({}, superAdmin);
      expectBaseJoins();
    });
  });

  describe("findAllDeactivated()", () => {
    it("calls andWhere with Brackets when search is provided", async () => {
      await service.findAllDeactivated(
        { search: "rossi", page: 1, perPage: 10 },
        superAdmin,
      );

      const bracketsCall = mockQb.andWhere.mock.calls.find(
        ([arg]) => arg instanceof Brackets,
      );
      expect(bracketsCall).toBeDefined();
    });

    it("does not add Brackets andWhere when search is absent", async () => {
      await service.findAllDeactivated({ page: 1, perPage: 10 }, superAdmin);

      const bracketsCall = mockQb.andWhere.mock.calls.find(
        ([arg]) => arg instanceof Brackets,
      );
      expect(bracketsCall).toBeUndefined();
    });

    it("applies base/contratto/grade joins", async () => {
      await service.findAllDeactivated({ page: 1, perPage: 10 }, superAdmin);
      expectBaseJoins();
    });
  });

  describe("findByCrewcode()", () => {
    it("applies base/contratto/grade joins", async () => {
      await service.findByCrewcode("CPT0001");
      expectBaseJoins();
    });
  });

  describe("create() — field normalization", () => {
    const createDto = {
      crewcode: "cpt0001",
      nome: "mario",
      cognome: "rossi",
      email: "MARIO@EXAMPLE.COM",
      telefono: "+39 333 1234567",
      ruolo: Ruolo.PILOT,
      dataIscrizione: "15/06/2020",
      dateOfEntry: "01/01/2015",
      dateOfCaptaincy: undefined,
      role: UserRole.USER,
    } as any;

    beforeEach(() => {
      // No duplicate crewcode or email
      mockQb.getOne.mockResolvedValue(null);
      usersRepo.findOne.mockResolvedValue(null);
      usersRepo.create = jest.fn().mockImplementation((x) => x);
      usersRepo.save = jest
        .fn()
        .mockImplementation((x) => Promise.resolve({ ...x, id: "new-uuid" }));
      usersRepo.update = jest.fn().mockResolvedValue(undefined);
    });

    it("uppercases crewcode", async () => {
      await service.create({ ...createDto }, superAdmin);
      const saved = usersRepo.save.mock.calls[0][0];
      expect(saved.crewcode).toBe("CPT0001");
    });

    it("lowercases email", async () => {
      await service.create({ ...createDto }, superAdmin);
      const saved = usersRepo.save.mock.calls[0][0];
      expect(saved.email).toBe("mario@example.com");
    });

    it("title-cases nome and cognome", async () => {
      await service.create({ ...createDto }, superAdmin);
      const saved = usersRepo.save.mock.calls[0][0];
      expect(saved.nome).toBe("Mario");
      expect(saved.cognome).toBe("Rossi");
    });

    it("converts dataIscrizione from DD/MM/YYYY to YYYY-MM-DD", async () => {
      await service.create({ ...createDto }, superAdmin);
      const saved = usersRepo.save.mock.calls[0][0];
      expect(saved.dataIscrizione).toBe("2020-06-15");
    });

    it("converts dateOfEntry from DD/MM/YYYY to YYYY-MM-DD", async () => {
      await service.create({ ...createDto }, superAdmin);
      const saved = usersRepo.save.mock.calls[0][0];
      expect(saved.dateOfEntry).toBe("2015-01-01");
    });

    it("hashes password to bcrypt hash of 'password'", async () => {
      await service.create({ ...createDto }, superAdmin);
      const saved = usersRepo.save.mock.calls[0][0];
      const bcrypt = await import("bcrypt");
      expect(await bcrypt.compare("password", saved.password)).toBe(true);
    });
  });
});
