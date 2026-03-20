# UnionConnect — Backend Architecture

## NestJS + TypeORM + PostgreSQL

> **v1.3:** All UI, API messages, code comments, and documentation translated to English. Grade names in English. Contract names in English. Extensible architecture for future Tools section.

> Backend architecture document for UnionConnect.
> Stack: NestJS 11.x, TypeORM 0.3.x, PostgreSQL 15+, Passport.js + JWT, class-validator, bcrypt
>
> **ARCHITECTURAL NOTE v1.1:** Single `users` table (member = user). Login via `crewcode` + `password`. Default password: "password". Field `ruolo` (pilot/cabin_crew) with role-specific grades. Admin scoped by role.
>
> **NOTE v1.2:** **Grades** are now a CRUD entity managed by SuperAdmin (like Bases and Contracts). New table `grades` (id, codice, nome, ruolo). The field `grado VARCHAR(100)` in users becomes `grade_id UUID REFERENCES grades(id)`. New CRUD endpoints `/api/v1/grades`.
>
> **NOTE v1.3:** All `ruolo` enum values, API messages, emails and WhatsApp templates are now in English (`pilot`/`cabin_crew`). Software fully in English.

---

## Table of Contents

1. [PostgreSQL Database Schema](#1-postgresql-database-schema)
2. [TypeORM Migrations](#2-typeorm-migrations)
3. [Full REST API](#3-full-rest-api)
4. [Authentication and Authorization](#4-authentication-and-authorization)
5. [PDF Parsing](#5-pdf-parsing)
6. [Email and WhatsApp Notifications](#6-email-and-whatsapp-notifications)
7. [NestJS Project Structure](#7-nestjs-project-structure)
8. [Class-Validator DTOs](#8-class-validator-dtos)
9. [Security](#9-security)
10. [Seed Data](#10-seed-data)

---

## 1. PostgreSQL Database Schema

### ER Diagram (Single Table)

```
users (= members, single unified table)
 ├── bases    (base_id FK)
 ├── contracts (contratto_id FK)
 └── grades   (grade_id FK)

bases
contracts
grades          → belongs to a role (pilot | cabin_crew)
refresh_tokens → users
user_pdf_uploads -> users
```

> **NOTE:** There is no separate `members` table. Every member IS a user.

### Table `users` (unified: authentication + member data)

```sql
CREATE TABLE users (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Authentication
  crewcode              VARCHAR(50)  NOT NULL UNIQUE,  -- used for LOGIN
  password              VARCHAR(255) NOT NULL,         -- default: hash('password')
  role                  VARCHAR(20)  NOT NULL DEFAULT 'user'
                          CHECK (role IN ('superadmin', 'admin', 'user')),
  must_change_password  BOOLEAN      NOT NULL DEFAULT true,
  is_active             BOOLEAN      NOT NULL DEFAULT true,
  -- Professional data
  ruolo                 VARCHAR(25)  CHECK (ruolo IN ('pilot', 'cabin_crew')),
                          -- nullable only for superadmin
  nome                  VARCHAR(100) NOT NULL,
  cognome               VARCHAR(100) NOT NULL,
  email                 VARCHAR(255) NOT NULL UNIQUE,
  telefono              VARCHAR(30),
  base_id               UUID         REFERENCES bases(id) ON DELETE SET NULL,
  contratto_id          UUID         REFERENCES contracts(id) ON DELETE SET NULL,
  grade_id              UUID         REFERENCES grades(id) ON DELETE SET NULL,
  -- Sensitive fields (visible only to admin/superadmin)
  note                  TEXT,
  itud                  BOOLEAN      NOT NULL DEFAULT false,
  rsa                   BOOLEAN      NOT NULL DEFAULT false,
  -- Timestamps
  created_at            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_crewcode     ON users(crewcode);
CREATE INDEX idx_users_email        ON users(email);
CREATE INDEX idx_users_role         ON users(role);
CREATE INDEX idx_users_ruolo        ON users(ruolo);
CREATE INDEX idx_users_base_id      ON users(base_id);
CREATE INDEX idx_users_contratto_id ON users(contratto_id);
-- Full-text search on nome/cognome
CREATE INDEX idx_users_fts ON users USING gin(
  to_tsvector('italian', nome || ' ' || cognome)
);
```

**Grade validation by role:** The backend verifies that the provided `grade_id` exists in the `grades` table and that the grade's `ruolo` matches the user's `ruolo`.

### Table `refresh_tokens`

```sql
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT         NOT NULL UNIQUE,
  expires_at  TIMESTAMPTZ  NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token   ON refresh_tokens(token);
```

### Table `bases`

```sql
CREATE TABLE bases (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice     VARCHAR(20)  NOT NULL UNIQUE,
  nome       VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_bases_codice ON bases(codice);
```

### Table `contracts`

```sql
CREATE TABLE contracts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice     VARCHAR(20)  NOT NULL UNIQUE,
  nome       VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_contracts_codice ON contracts(codice);
```

### Table `grades` (v1.2)

```sql
CREATE TABLE grades (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice     VARCHAR(20)  NOT NULL UNIQUE,
  nome       VARCHAR(255) NOT NULL,
  ruolo      VARCHAR(25)  NOT NULL CHECK (ruolo IN ('pilot', 'cabin_crew')),
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_grades_codice ON grades(codice);
CREATE INDEX idx_grades_ruolo  ON grades(ruolo);
```

### ~~Table `members`~~ — REMOVED (v1.1)

> The `members` table no longer exists. All member data is in the `users` table above.

### Table `pdf_field_mappings` (v1.3)

Stores configurable field mappings for PDF extraction per role.

```sql
CREATE TABLE pdf_field_mappings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role        VARCHAR(25)  NOT NULL CHECK (role IN ('pilot', 'cabin_crew')),
  name        VARCHAR(255) NOT NULL,
  is_default  BOOLEAN      NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_pdf_mappings_default ON pdf_field_mappings(role) WHERE is_default = true;
```

### Table `pdf_field_mapping_items` (v1.3)

Individual field mappings within a configuration.

```sql
CREATE TABLE pdf_field_mapping_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pdf_field_mapping_id UUID NOT NULL REFERENCES pdf_field_mappings(id) ON DELETE CASCADE,
  pdf_field_name      VARCHAR(255) NOT NULL,
  member_field        VARCHAR(255) NOT NULL,  -- e.g., 'nome', 'cognome', 'crewcode'
  extraction_type     VARCHAR(20)  NOT NULL CHECK (extraction_type IN ('pdf_field', 'ocr_pattern')),
  ocr_pattern         TEXT,         -- Regex pattern for OCR extraction
  is_required         BOOLEAN      NOT NULL DEFAULT false,
  sort_order          INTEGER      NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_pdf_mapping_items_mapping ON pdf_field_mapping_items(pdf_field_mapping_id);
```

### Table `excel_field_mappings` (v1.3)

Stores configurable column mappings for Excel/CSV bulk import per role.

```sql
CREATE TABLE excel_field_mappings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role        VARCHAR(25)  NOT NULL CHECK (role IN ('pilot', 'cabin_crew')),
  name        VARCHAR(255) NOT NULL,
  is_default  BOOLEAN      NOT NULL DEFAULT false,
  headers     TEXT[],       -- Array of expected column headers
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_excel_mappings_default ON excel_field_mappings(role) WHERE is_default = true;
```

### Table `excel_field_mapping_items` (v1.3)

Individual column mappings within an Excel import configuration.

```sql
CREATE TABLE excel_field_mapping_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  excel_field_mapping_id UUID NOT NULL REFERENCES excel_field_mappings(id) ON DELETE CASCADE,
  column_index         INTEGER      NOT NULL,  -- 0-based column index
  header_name          VARCHAR(255) NOT NULL,   -- Expected header text
  member_field         VARCHAR(255) NOT NULL,   -- e.g., 'nome', 'cognome', 'crewcode'
  is_required          BOOLEAN      NOT NULL DEFAULT false,
  validation           VARCHAR(50),  -- 'lookup_base', 'lookup_grade', 'lookup_contract', 'email', 'phone', etc.
  sort_order           INTEGER      NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_excel_mapping_items_mapping ON excel_field_mapping_items(excel_field_mapping_id);
CREATE INDEX idx_excel_mapping_items_field ON excel_field_mapping_items(member_field);
```

### Table `bulk_import_jobs` (v1.3)

Tracks bulk import operations with preview and execution status.

```sql
CREATE TABLE bulk_import_jobs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by     UUID         NOT NULL REFERENCES users(id),
  role            VARCHAR(25)  NOT NULL CHECK (role IN ('pilot', 'cabin_crew')),
  excel_field_mapping_id UUID REFERENCES excel_field_mappings(id),
  filename        VARCHAR(255) NOT NULL,
  filepath        TEXT         NOT NULL,
  file_type       VARCHAR(20)  NOT NULL CHECK (file_type IN ('xlsx', 'xls', 'csv')),
  total_rows      INTEGER,
  processed_rows  INTEGER      DEFAULT 0,
  valid_rows      INTEGER      DEFAULT 0,
  invalid_rows    INTEGER      DEFAULT 0,
  created_count   INTEGER      DEFAULT 0,
  updated_count   INTEGER      DEFAULT 0,
  skipped_count   INTEGER      DEFAULT 0,
  failed_count    INTEGER      DEFAULT 0,
  status          VARCHAR(20)  NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'preview_ready', 'processing', 'completed', 'failed')),
  preview_data    JSONB,        -- Array of row previews with validation results
  results         JSONB,        -- Final import results
  error_log       JSONB,        -- Array of failed rows with reasons
  options         JSONB,        -- Import options (skipInvalid, updateExisting, etc.)
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_bulk_import_status ON bulk_import_jobs(status);
CREATE INDEX idx_bulk_import_uploaded_by ON bulk_import_jobs(uploaded_by);
```

### Table `user_pdf_uploads`

```sql
CREATE TABLE user_pdf_uploads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID         REFERENCES users(id) ON DELETE CASCADE,
  filename    VARCHAR(255) NOT NULL,
  filepath    TEXT         NOT NULL,
  extraction_method VARCHAR(20) CHECK (extraction_method IN ('form_fields', 'ocr', 'manual')),
  confidence  DECIMAL(3,2),  -- 0.00 to 1.00
  parsed_data JSONB,
  status      VARCHAR(20)  NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'processed', 'failed')),
  error_msg   TEXT,
  uploaded_by UUID         NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);
```

---

## 2. TypeORM Migrations

### Migration file structure

```
api/src/database/migrations/
  1772784961186-InitialMigration.ts         # Initial schema creation
  1772784961187-AddRefreshTokens.ts         # Refresh tokens table
  1772784961188-AddPdfFieldMappings.ts      # v1.3 - PDF extraction config
  1772784961189-AddExcelFieldMappings.ts    # v1.3 - Excel bulk import config
  1772784961190-AddBulkImportJobs.ts        # v1.3 - Bulk import tracking
```

> **NOTE:** TypeORM migrations use timestamps as prefixes for ordering. All migrations are TypeScript classes implementing `MigrationInterface` with `up()` and `down()` methods.

### NPM Commands

```bash
# Run all pending migrations
npm run migration:run

# Generate a new migration from entity changes
npm run migration:generate -- src/database/migrations/MigrationName

# Create an empty migration file
npm run migration:create -- src/database/migrations/MigrationName

# Revert the last migration
npm run migration:revert

# Show migration status
npm run migration:show
```

### TypeORM Migration Example (v1.2 - Grades Table)

```typescript
// src/database/migrations/1772784961186-InitialMigration.ts
import { MigrationInterface, QueryRunner, Table, TableIndex } from "typeorm";

export class InitialMigration1772784961186 implements MigrationInterface {
  name = "InitialMigration1772784961186";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create grades table
    await queryRunner.createTable(
      new Table({
        name: "grades",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          { name: "codice", type: "varchar", length: "20", isUnique: true },
          { name: "nome", type: "varchar", length: "255" },
          { name: "ruolo", type: "enum", enum: ["pilot", "cabin_crew"] },
          { name: "created_at", type: "timestamptz", default: "now()" },
          { name: "updated_at", type: "timestamptz", default: "now()" },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      "grades",
      new TableIndex({ name: "idx_grades_codice", columnNames: ["codice"] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("grades");
  }
}
```

### TypeORM Users Migration (Unified Table)

```typescript
// src/database/migrations/1772784961186-InitialMigration.ts (excerpt)
import {
  MigrationInterface,
  QueryRunner,
  Table,
  TableIndex,
  TableForeignKey,
} from "typeorm";

export class InitialMigration1772784961186 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create users table (unified: auth + member data)
    await queryRunner.createTable(
      new Table({
        name: "users",
        columns: [
          {
            name: "id",
            type: "uuid",
            isPrimary: true,
            generationStrategy: "uuid",
            default: "gen_random_uuid()",
          },
          // Authentication
          { name: "crewcode", type: "varchar", length: "50", isUnique: true },
          { name: "password", type: "varchar", length: "255" },
          {
            name: "role",
            type: "enum",
            enum: ["superadmin", "admin", "user"],
            default: "'user'",
          },
          { name: "must_change_password", type: "boolean", default: true },
          { name: "is_active", type: "boolean", default: true },
          // Professional data
          {
            name: "ruolo",
            type: "enum",
            enum: ["pilot", "cabin_crew"],
            isNullable: true,
          },
          { name: "nome", type: "varchar", length: "100" },
          { name: "cognome", type: "varchar", length: "100" },
          { name: "email", type: "varchar", length: "255", isUnique: true },
          { name: "telefono", type: "varchar", length: "30", isNullable: true },
          { name: "base_id", type: "uuid", isNullable: true },
          { name: "contratto_id", type: "uuid", isNullable: true },
          { name: "grade_id", type: "uuid", isNullable: true },
          // Sensitive fields
          { name: "note", type: "text", isNullable: true },
          { name: "itud", type: "boolean", default: false },
          { name: "rsa", type: "boolean", default: false },
          // Timestamps
          { name: "created_at", type: "timestamptz", default: "now()" },
          { name: "updated_at", type: "timestamptz", default: "now()" },
        ],
      }),
      true,
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      "users",
      new TableForeignKey({
        columnNames: ["base_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "bases",
        onDelete: "SET NULL",
      }),
    );
    await queryRunner.createForeignKey(
      "users",
      new TableForeignKey({
        columnNames: ["contratto_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "contracts",
        onDelete: "SET NULL",
      }),
    );
    await queryRunner.createForeignKey(
      "users",
      new TableForeignKey({
        columnNames: ["grade_id"],
        referencedColumnNames: ["id"],
        referencedTableName: "grades",
        onDelete: "SET NULL",
      }),
    );

    // Indexes
    await queryRunner.createIndex(
      "users",
      new TableIndex({ name: "idx_users_crewcode", columnNames: ["crewcode"] }),
    );
    await queryRunner.createIndex(
      "users",
      new TableIndex({ name: "idx_users_email", columnNames: ["email"] }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable("users");
  }
}
```

### `1700000002_create_refresh_tokens_table.ts`

```typescript
import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "refresh_tokens";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid("id")
        .primary()
        .defaultTo(this.db.rawQuery("gen_random_uuid()").knexQuery);
      table
        .uuid("user_id")
        .notNullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.text("token").notNullable().unique();
      table.timestamp("expires_at", { useTz: true }).notNullable();
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(this.now());
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
```

### `1700000003_create_bases_table.ts`

```typescript
import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "bases";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid("id")
        .primary()
        .defaultTo(this.db.rawQuery("gen_random_uuid()").knexQuery);
      table.string("codice", 20).notNullable().unique();
      table.string("nome", 255).notNullable();
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(this.now());
      table
        .timestamp("updated_at", { useTz: true })
        .notNullable()
        .defaultTo(this.now());
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
```

### `1700000004_create_contracts_table.ts`

```typescript
import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "contracts";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid("id")
        .primary()
        .defaultTo(this.db.rawQuery("gen_random_uuid()").knexQuery);
      table.string("codice", 20).notNullable().unique();
      table.string("nome", 255).notNullable();
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(this.now());
      table
        .timestamp("updated_at", { useTz: true })
        .notNullable()
        .defaultTo(this.now());
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
```

### ~~`create_members_table`~~ — REMOVED (v1.1)

> No longer exists. Member fields are in the `create_users_table` migration.

### `1700000006_create_pdf_field_mappings_table.ts` (v1.3)

```typescript
import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "pdf_field_mappings";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid("id")
        .primary()
        .defaultTo(this.db.rawQuery("gen_random_uuid()").knexQuery);
      table.enum("role", ["pilot", "cabin_crew"]).notNullable();
      table.string("name", 255).notNullable();
      table.boolean("is_default").notNullable().defaultTo(false);
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(this.now());
      table
        .timestamp("updated_at", { useTz: true })
        .notNullable()
        .defaultTo(this.now());

      // Only one default mapping per role
      table.unique(["role"], {
        indexName: "idx_pdf_mappings_default",
        whereRaw: "is_default = true",
      });
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
```

### `1700000007_create_pdf_field_mapping_items_table.ts` (v1.3)

```typescript
import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "pdf_field_mapping_items";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid("id")
        .primary()
        .defaultTo(this.db.rawQuery("gen_random_uuid()").knexQuery);
      table
        .uuid("pdf_field_mapping_id")
        .notNullable()
        .references("id")
        .inTable("pdf_field_mappings")
        .onDelete("CASCADE");
      table.string("pdf_field_name", 255).notNullable();
      table.string("member_field", 255).notNullable();
      table.enum("extraction_type", ["pdf_field", "ocr_pattern"]).notNullable();
      table.text("ocr_pattern").nullable();
      table.boolean("is_required").notNullable().defaultTo(false);
      table.integer("sort_order").notNullable().defaultTo(0);
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(this.now());

      table.index("pdf_field_mapping_id", "idx_pdf_mapping_items_mapping");
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
```

### `1700000008_create_excel_field_mappings_table.ts` (v1.3)

```typescript
import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "excel_field_mappings";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid("id")
        .primary()
        .defaultTo(this.db.rawQuery("gen_random_uuid()").knexQuery);
      table.enum("role", ["pilot", "cabin_crew"]).notNullable();
      table.string("name", 255).notNullable();
      table.boolean("is_default").notNullable().defaultTo(false);
      table.specificType("headers", "text[]").nullable(); // PostgreSQL array
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(this.now());
      table
        .timestamp("updated_at", { useTz: true })
        .notNullable()
        .defaultTo(this.now());

      // Only one default mapping per role
      table.unique(["role"], {
        indexName: "idx_excel_mappings_default",
        whereRaw: "is_default = true",
      });
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
```

### `1700000009_create_excel_field_mapping_items_table.ts` (v1.3)

```typescript
import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "excel_field_mapping_items";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid("id")
        .primary()
        .defaultTo(this.db.rawQuery("gen_random_uuid()").knexQuery);
      table
        .uuid("excel_field_mapping_id")
        .notNullable()
        .references("id")
        .inTable("excel_field_mappings")
        .onDelete("CASCADE");
      table.integer("column_index").notNullable();
      table.string("header_name", 255).notNullable();
      table.string("member_field", 255).notNullable();
      table.boolean("is_required").notNullable().defaultTo(false);
      table.string("validation", 50).nullable(); // lookup_base, lookup_grade, email, etc.
      table.integer("sort_order").notNullable().defaultTo(0);
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(this.now());

      table.index("excel_field_mapping_id", "idx_excel_mapping_items_mapping");
      table.index("member_field", "idx_excel_mapping_items_field");
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
```

### `1700000010_create_bulk_import_jobs_table.ts` (v1.3)

```typescript
import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "bulk_import_jobs";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid("id")
        .primary()
        .defaultTo(this.db.rawQuery("gen_random_uuid()").knexQuery);
      table.uuid("uploaded_by").notNullable().references("id").inTable("users");
      table.enum("role", ["pilot", "cabin_crew"]).notNullable();
      table
        .uuid("excel_field_mapping_id")
        .nullable()
        .references("id")
        .inTable("excel_field_mappings");
      table.string("filename", 255).notNullable();
      table.text("filepath").notNullable();
      table.enum("file_type", ["xlsx", "xls", "csv"]).notNullable();
      table.integer("total_rows").nullable();
      table.integer("processed_rows").notNullable().defaultTo(0);
      table.integer("valid_rows").notNullable().defaultTo(0);
      table.integer("invalid_rows").notNullable().defaultTo(0);
      table.integer("created_count").notNullable().defaultTo(0);
      table.integer("updated_count").notNullable().defaultTo(0);
      table.integer("skipped_count").notNullable().defaultTo(0);
      table.integer("failed_count").notNullable().defaultTo(0);
      table
        .enum("status", [
          "pending",
          "preview_ready",
          "processing",
          "completed",
          "failed",
        ])
        .notNullable()
        .defaultTo("pending");
      table.jsonb("preview_data").nullable();
      table.jsonb("results").nullable();
      table.jsonb("error_log").nullable();
      table.jsonb("options").nullable();
      table.timestamp("started_at", { useTz: true }).nullable();
      table.timestamp("completed_at", { useTz: true }).nullable();
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(this.now());

      table.index("status", "idx_bulk_import_status");
      table.index("uploaded_by", "idx_bulk_import_uploaded_by");
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
```

### `1700000011_create_user_pdf_uploads_table.ts`

```typescript
import { BaseSchema } from "@adonisjs/lucid/schema";

export default class extends BaseSchema {
  protected tableName = "user_pdf_uploads";

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table
        .uuid("id")
        .primary()
        .defaultTo(this.db.rawQuery("gen_random_uuid()").knexQuery);
      table
        .uuid("user_id")
        .nullable()
        .references("id")
        .inTable("users")
        .onDelete("CASCADE");
      table.string("filename", 255).notNullable();
      table.text("filepath").notNullable();
      table.jsonb("parsed_data").nullable();
      table
        .enum("status", ["pending", "processed", "failed"])
        .notNullable()
        .defaultTo("pending");
      table.text("error_msg").nullable();
      table.uuid("uploaded_by").notNullable().references("id").inTable("users");
      table
        .timestamp("created_at", { useTz: true })
        .notNullable()
        .defaultTo(this.now());
    });
  }

  async down() {
    this.schema.dropTable(this.tableName);
  }
}
```

---

## 3. Full REST API

### Base URL: `/api/v1`

### Response Conventions

**Success:**

```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "perPage": 20, "total": 150 }
}
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid data",
    "details": [{ "field": "email", "message": "Invalid email" }]
  }
}
```

---

### 3.1 Auth Endpoints

#### `POST /api/v1/auth/login`

**Request:**

```json
{
  "crewcode": "AB1234",
  "password": "password123"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "a1b2c3d4-...",
    "expiresIn": 900,
    "mustChangePassword": false,
    "user": {
      "id": "uuid",
      "crewcode": "AB1234",
      "role": "admin",
      "ruolo": "pilot",
      "nome": "Marco",
      "cognome": "Rossi"
    }
  }
}
```

> **NOTE:** If `mustChangePassword: true`, the frontend must redirect to `POST /auth/change-password` before allowing any other action.

**Response 401:**

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid crewcode or password"
  }
}
```

---

#### `POST /api/v1/auth/refresh`

**Request:**

```json
{ "refreshToken": "a1b2c3d4-..." }
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

---

#### `POST /api/v1/auth/logout`

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{ "refreshToken": "a1b2c3d4-..." }
```

**Response 200:**

```json
{ "success": true, "data": { "message": "Logged out successfully" } }
```

---

#### `GET /api/v1/auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "crewcode": "CR001",
    "role": "user",
    "ruolo": "pilot",
    "nome": "Mario",
    "cognome": "Rossi",
    "email": "user@example.com",
    "telefono": "+39...",
    "base": { "id": "uuid", "codice": "MXP", "nome": "Milano Malpensa" },
    "contratto": { "id": "uuid", "codice": "AZ-PI", "nome": "Pilots Alitalia" },
    "grade": { "id": "uuid", "codice": "CMD", "nome": "Commander" },
    "mustChangePassword": false
  }
}
```

> **NOTE:** The fields `note`, `itud`, `rsa` are included only if the role is admin/superadmin.

---

#### `POST /api/v1/auth/change-password`

**Headers:** `Authorization: Bearer <token>`

**Request:**

```json
{
  "currentPassword": "password",
  "newPassword": "NewPassword123!"
}
```

**Response 200:**

```json
{
  "success": true,
  "data": { "message": "Password updated successfully" }
}
```

> Sets `must_change_password = false` after the change.

---

### 3.2 Users Endpoints (ex Members — unified table)

**Roles:**

- `GET /members` — admin, superadmin
- `GET /members/:id` — admin, superadmin, user (only own profile)
- `POST /members` — admin, superadmin
- `PUT /members/:id` — admin, superadmin, user (only own non-sensitive fields)
- `DELETE /members/:id` — superadmin
- `POST /members/upload-pdf` — admin, superadmin

---

#### `GET /api/v1/members`

**Headers:** `Authorization: Bearer <token>` (admin/superadmin)

**Query params:**

- `page` (default: 1)
- `perPage` (default: 20, max: 100)
- `search` — full-text on nome/cognome
- `base_id` — filter by base
- `contratto_id` — filter by contract
- `grade` — filter by grade

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nome": "Mario",
      "cognome": "Rossi",
      "email": "mario.rossi@example.com",
      "crewcode": "CR001",
      "telefono": "+39 333 1234567",
      "base": { "id": "uuid", "codice": "MXP", "nome": "Milano Malpensa" },
      "contratto": {
        "id": "uuid",
        "codice": "AZ-PI",
        "nome": "Pilots Alitalia"
      },
      "grade": { "id": "uuid", "codice": "CMD", "nome": "Commander" },
      "note": "Admin note",
      "itud": true,
      "rsa": false,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "meta": { "page": 1, "perPage": 20, "total": 150, "lastPage": 8 }
}
```

> **NOTE:** The fields `note`, `itud`, `rsa` are **omitted** if the requester has role `user`.

---

#### `GET /api/v1/members/:id`

**Response 200 (admin/superadmin):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "Mario",
    "cognome": "Rossi",
    "email": "mario.rossi@example.com",
    "crewcode": "CR001",
    "telefono": "+39 333 1234567",
    "base": { "id": "uuid", "codice": "MXP", "nome": "Milano Malpensa" },
    "contratto": { "id": "uuid", "codice": "AZ-PI", "nome": "Pilots Alitalia" },
    "grade": { "id": "uuid", "codice": "CMD", "nome": "Commander" },
    "note": "Admin note",
    "itud": true,
    "rsa": false,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Response 200 (user — own profile only, sensitive fields removed):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "Mario",
    "cognome": "Rossi",
    "email": "mario.rossi@example.com",
    "crewcode": "CR001",
    "telefono": "+39 333 1234567",
    "base": { "id": "uuid", "codice": "MXP", "nome": "Milano Malpensa" },
    "contratto": { "id": "uuid", "codice": "AZ-PI", "nome": "Pilots Alitalia" },
    "grade": { "id": "uuid", "codice": "CMD", "nome": "Commander" }
  }
}
```

---

#### `POST /api/v1/members`

**Headers:** `Authorization: Bearer <token>` (admin/superadmin)

**Request:**

```json
{
  "nome": "Mario",
  "cognome": "Rossi",
  "email": "mario.rossi@example.com",
  "crewcode": "CR001",
  "telefono": "+39 333 1234567",
  "baseId": "uuid-base",
  "contrattoId": "uuid-contract",
  "gradeId": "uuid-grade",
  "note": "Internal note",
  "itud": true,
  "rsa": false
}
```

**Response 201:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nome": "Mario",
    "cognome": "Rossi",
    "email": "mario.rossi@example.com",
    "crewcode": "CR001",
    "telefono": "+39 333 1234567",
    "base": { "id": "uuid", "codice": "MXP", "nome": "Milano Malpensa" },
    "contratto": { "id": "uuid", "codice": "AZ-PI", "nome": "Pilots Alitalia" },
    "grade": { "id": "uuid", "codice": "CMD", "nome": "Commander" },
    "note": "Internal note",
    "itud": true,
    "rsa": false,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

> After creation: welcome email + WhatsApp queued on BullMQ.

---

#### `PUT /api/v1/members/:id`

**Request (admin/superadmin — all fields):**

```json
{
  "nome": "Mario",
  "cognome": "Rossi",
  "email": "mario.rossi@example.com",
  "crewcode": "CR001",
  "telefono": "+39 333 1234567",
  "baseId": "uuid-base",
  "contrattoId": "uuid-contract",
  "gradeId": "uuid-grade",
  "note": "Updated note",
  "itud": false,
  "rsa": true
}
```

**Request (user — non-sensitive fields only):**

```json
{
  "telefono": "+39 333 9876543"
}
```

> The fields `note`, `itud`, `rsa`, `email`, `crewcode`, `baseId`, `contrattoId` are ignored if sent by a `user`.

**Response 200:** same schema as GET /:id

---

#### `DELETE /api/v1/members/:id`

**Headers:** `Authorization: Bearer <token>` (superadmin only)

**Response 200:**

```json
{ "success": true, "data": { "message": "Member deleted" } }
```

---

#### `POST /api/v1/members/extract-pdf` (v1.3)

Extract member data from uploaded PDF using three-tier extraction strategy.

**Headers:** `Authorization: Bearer <token>` (admin/superadmin)
**Content-Type:** `multipart/form-data`

**Request:**

```
file: <PDF file>
role: "pilot" | "cabin_crew"  // Hint for field mapping selection
```

**Response 200 (form fields extracted):**

```json
{
  "success": true,
  "data": {
    "uploadId": "uuid",
    "extractionMethod": "form_fields",
    "confidence": 0.92,
    "parsedData": {
      "nome": "Mario",
      "cognome": "Rossi",
      "email": "mario.rossi@example.com",
      "crewcode": "CR001",
      "telefono": "+39 333 1234567",
      "grade": "Commander",
      "baseCode": "MXP",
      "contrattoCode": "AZ-PI"
    },
    "rawPdfUrl": "/uploads/temp/uuid.pdf"
  }
}
```

**Response 200 (OCR fallback):**

```json
{
  "success": true,
  "data": {
    "uploadId": "uuid",
    "extractionMethod": "ocr",
    "confidence": 0.65,
    "parsedData": {
      "nome": "Mario",
      "cognome": "Rossi",
      "email": "mario.rossi@example.com",
      "crewcode": "CR001",
      "telefono": null,
      "grade": null,
      "baseCode": null,
      "contrattoCode": null
    },
    "rawPdfUrl": "/uploads/temp/uuid.pdf",
    "warning": "Low confidence extraction - please verify all fields"
  }
}
```

**Response 200 (manual input required):**

```json
{
  "success": true,
  "data": {
    "uploadId": "uuid",
    "extractionMethod": "manual",
    "confidence": 0,
    "parsedData": {},
    "rawPdfUrl": "/uploads/temp/uuid.pdf",
    "warning": "Could not extract data - please enter manually"
  }
}
```

> The frontend uses `parsedData` to pre-populate the form. The PDF remains visible for side-by-side verification.

---

### 3.3 PDF Field Mappings Endpoints (SuperAdmin only)

Configure PDF field extraction mappings per role.

#### `GET /api/v1/pdf-field-mappings`

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "role": "pilot",
      "name": "Pilot Registration Form 2024",
      "isDefault": true,
      "itemsCount": 8,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid-2",
      "role": "cabin_crew",
      "name": "Cabin Crew Registration Form 2024",
      "isDefault": true,
      "itemsCount": 8,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### `GET /api/v1/pdf-field-mappings/:id`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "role": "pilot",
    "name": "Pilot Registration Form 2024",
    "isDefault": true,
    "items": [
      {
        "id": "uuid-item-1",
        "pdfFieldName": "nome",
        "memberField": "nome",
        "extractionType": "pdf_field",
        "ocrPattern": null,
        "isRequired": true,
        "sortOrder": 1
      },
      {
        "id": "uuid-item-2",
        "pdfFieldName": "cognome",
        "memberField": "cognome",
        "extractionType": "pdf_field",
        "ocrPattern": null,
        "isRequired": true,
        "sortOrder": 2
      },
      {
        "id": "uuid-item-3",
        "pdfFieldName": "crew_code",
        "memberField": "crewcode",
        "extractionType": "ocr_pattern",
        "ocrPattern": "Crew Code:\\\s*([A-Z0-9]{3,15})",
        "isRequired": true,
        "sortOrder": 3
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### `POST /api/v1/pdf-field-mappings`

**Request:**

```json
{
  "role": "pilot",
  "name": "Pilot Registration Form 2024",
  "isDefault": true,
  "items": [
    {
      "pdfFieldName": "nome",
      "memberField": "nome",
      "extractionType": "pdf_field",
      "isRequired": true,
      "sortOrder": 1
    },
    {
      "pdfFieldName": "cognome",
      "memberField": "cognome",
      "extractionType": "pdf_field",
      "isRequired": true,
      "sortOrder": 2
    },
    {
      "pdfFieldName": "crew_code",
      "memberField": "crewcode",
      "extractionType": "ocr_pattern",
      "ocrPattern": "Crew Code:\\\s*([A-Z0-9]{3,15})",
      "isRequired": true,
      "sortOrder": 3
    },
    {
      "pdfFieldName": "email",
      "memberField": "email",
      "extractionType": "pdf_field",
      "isRequired": true,
      "sortOrder": 4
    },
    {
      "pdfFieldName": "telefono",
      "memberField": "telefono",
      "extractionType": "pdf_field",
      "isRequired": false,
      "sortOrder": 5
    }
  ]
}
```

#### `PUT /api/v1/pdf-field-mappings/:id`

**Request:**

```json
{
  "name": "Updated Pilot Form",
  "isDefault": true,
  "items": [
    {
      "pdfFieldName": "first_name",
      "memberField": "nome",
      "extractionType": "pdf_field",
      "isRequired": true,
      "sortOrder": 1
    }
  ]
}
```

#### `DELETE /api/v1/pdf-field-mappings/:id`

**Response 200:**

```json
{ "success": true, "data": { "message": "Mapping deleted" } }
```

> Only one mapping per role can be `isDefault: true`. The default mapping is used when no specific mapping is requested.

---

### 3.3b Excel Field Mappings Endpoints (SuperAdmin only) (v1.3)

Configure Excel/CSV column mappings per role for bulk import.

#### `GET /api/v1/excel-field-mappings`

**Response 200:**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "role": "pilot",
      "name": "Pilot Import Template",
      "isDefault": true,
      "headers": ["Nome", "Cognome", "Crewcode", "Email", "Telefono"],
      "itemsCount": 8,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid-2",
      "role": "cabin_crew",
      "name": "Cabin Crew Import Template",
      "isDefault": true,
      "headers": ["First Name", "Last Name", "Crew Code", "Email"],
      "itemsCount": 8,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### `GET /api/v1/excel-field-mappings/:id`

**Response 200:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "role": "pilot",
    "name": "Pilot Import Template",
    "isDefault": true,
    "headers": [
      "Nome",
      "Cognome",
      "Crewcode",
      "Email",
      "Telefono",
      "Base",
      "Grado"
    ],
    "items": [
      {
        "id": "uuid-item-1",
        "columnIndex": 0,
        "headerName": "Nome",
        "memberField": "nome",
        "isRequired": true
      },
      {
        "id": "uuid-item-2",
        "columnIndex": 1,
        "headerName": "Cognome",
        "memberField": "cognome",
        "isRequired": true
      },
      {
        "id": "uuid-item-3",
        "columnIndex": 2,
        "headerName": "Crewcode",
        "memberField": "crewcode",
        "isRequired": true
      },
      {
        "id": "uuid-item-4",
        "columnIndex": 3,
        "headerName": "Email",
        "memberField": "email",
        "isRequired": true
      },
      {
        "id": "uuid-item-5",
        "columnIndex": 4,
        "headerName": "Telefono",
        "memberField": "telefono",
        "isRequired": false
      },
      {
        "id": "uuid-item-6",
        "columnIndex": 5,
        "headerName": "Base",
        "memberField": "baseCode",
        "isRequired": false,
        "validation": "lookup_base" // Validates against bases table
      },
      {
        "id": "uuid-item-7",
        "columnIndex": 6,
        "headerName": "Grado",
        "memberField": "gradeCode",
        "isRequired": false,
        "validation": "lookup_grade" // Validates against grades table
      }
    ],
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### `POST /api/v1/excel-field-mappings`

**Request:**

```json
{
  "role": "pilot",
  "name": "Pilot Import Template",
  "isDefault": true,
  "headers": [
    "Nome",
    "Cognome",
    "Crewcode",
    "Email",
    "Telefono",
    "Base",
    "Grado"
  ],
  "items": [
    {
      "columnIndex": 0,
      "headerName": "Nome",
      "memberField": "nome",
      "isRequired": true
    },
    {
      "columnIndex": 1,
      "headerName": "Cognome",
      "memberField": "cognome",
      "isRequired": true
    },
    {
      "columnIndex": 2,
      "headerName": "Crewcode",
      "memberField": "crewcode",
      "isRequired": true
    },
    {
      "columnIndex": 3,
      "headerName": "Email",
      "memberField": "email",
      "isRequired": true
    },
    {
      "columnIndex": 4,
      "headerName": "Telefono",
      "memberField": "telefono",
      "isRequired": false
    },
    {
      "columnIndex": 5,
      "headerName": "Base",
      "memberField": "baseCode",
      "isRequired": false,
      "validation": "lookup_base"
    },
    {
      "columnIndex": 6,
      "headerName": "Grado",
      "memberField": "gradeCode",
      "isRequired": false,
      "validation": "lookup_grade"
    }
  ]
}
```

#### `PUT /api/v1/excel-field-mappings/:id`

**Request:**

```json
{
  "name": "Updated Pilot Template",
  "isDefault": true,
  "headers": ["First_Name", "Last_Name", "Crew_Code", "Email"],
  "items": [
    {
      "columnIndex": 0,
      "headerName": "First_Name",
      "memberField": "nome",
      "isRequired": true
    }
  ]
}
```

#### `DELETE /api/v1/excel-field-mappings/:id`

**Response 200:**

```json
{ "success": true, "data": { "message": "Excel mapping deleted" } }
```

---

### 3.3c Bulk Import Endpoints (Admin/SuperAdmin)

#### `POST /api/v1/members/bulk-import/preview` (v1.3)

Upload Excel/CSV and get preview of data to be imported with validation errors.

**Headers:** `Authorization: Bearer <token>` (admin/superadmin)
**Content-Type:** `multipart/form-data`

**Request:**

```
file: <Excel/CSV file>
role: "pilot" | "cabin_crew"  // Determines which mapping to use
mappingId: "uuid"  // Optional: specific mapping (uses default if not provided)
```

**Response 200:**

```json
{
  "success": true,
  "data": {
    "previewId": "uuid",
    "totalRows": 150,
    "validRows": 145,
    "invalidRows": 5,
    "mappingUsed": {
      "id": "uuid",
      "name": "Pilot Import Template",
      "headers": ["Nome", "Cognome", "Crewcode", "Email"]
    },
    "preview": [
      {
        "rowIndex": 1,
        "status": "valid",
        "data": {
          "nome": "Mario",
          "cognome": "Rossi",
          "crewcode": "CR001",
          "email": "mario.rossi@example.com",
          "telefono": "+39 333 1234567",
          "baseCode": "FCO",
          "gradeCode": "CMD"
        },
        "warnings": ["Phone number format normalized"]
      },
      {
        "rowIndex": 5,
        "status": "invalid",
        "data": {
          "nome": "Anna",
          "cognome": "Bianchi",
          "crewcode": "CR002",
          "email": "invalid-email",
          "telefono": null
        },
        "errors": ["Invalid email format"],
        "warnings": []
      },
      {
        "rowIndex": 12,
        "status": "duplicate",
        "data": { "crewcode": "CR003", "email": "giuseppe.verdi@example.com" },
        "errors": ["Crewcode already exists"],
        "existingMemberId": "uuid-existing"
      }
    ],
    "summary": {
      "newMembers": 145,
      "duplicates": 3,
      "validationErrors": 5,
      "baseCodeNotFound": ["XYZ"],
      "gradeCodeNotFound": ["OLD_GRADE"]
    }
  }
}
```

#### `POST /api/v1/members/bulk-import/execute` (v1.3)

Execute the import after preview review.

**Headers:** `Authorization: Bearer <token>` (admin/superadmin)

**Request:**

```json
{
  "previewId": "uuid",
  "options": {
    "skipInvalid": true, // Skip rows with validation errors
    "skipDuplicates": true, // Skip duplicate crewcodes
    "updateExisting": false, // If false, duplicates are skipped; if true, existing members are updated
    "notifyNewMembers": true, // Send welcome emails/WhatsApp
    "dryRun": false // If true, only simulates without saving
  }
}
```

**Response 200 (success):**

```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "completed",
    "results": {
      "created": 142,
      "updated": 0,
      "skipped": 5,
      "failed": 3,
      "duplicates": 3
    },
    "notificationsSent": 142,
    "failedRows": [
      {
        "rowIndex": 89,
        "reason": "Database constraint violation",
        "data": { "crewcode": "CR089" }
      }
    ],
    "downloadReportUrl": "/api/v1/reports/bulk-import/uuid.csv"
  }
}
```

**Response 202 (async processing for large files):**

```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "processing",
    "estimatedCompletion": "2024-01-15T10:30:00Z",
    "checkStatusUrl": "/api/v1/jobs/uuid"
  }
}
```

#### `GET /api/v1/jobs/:id` (v1.3)

Check status of async bulk import job.

**Response 200:**

```json
{
  "success": true,
  "data": {
    "jobId": "uuid",
    "status": "processing", // "pending" | "processing" | "completed" | "failed"
    "progress": 75, // Percentage
    "processedRows": 112,
    "totalRows": 150,
    "results": null // Populated when completed
  }
}
```

---

### 3.3 Bases Endpoints (SuperAdmin only)

#### `GET /api/v1/bases`

**Response 200:**

```json
{
  "success": true,
  "data": [
    { "id": "uuid", "codice": "MXP", "nome": "Milano Malpensa" },
    { "id": "uuid", "codice": "FCO", "nome": "Roma Fiumicino" }
  ]
}
```

#### `POST /api/v1/bases`

**Request:**

```json
{ "codice": "NAP", "nome": "Napoli Capodichino" }
```

#### `PUT /api/v1/bases/:id`

**Request:**

```json
{ "codice": "NAP", "nome": "Napoli Capodichino - Updated" }
```

#### `DELETE /api/v1/bases/:id`

**Response 200:**

```json
{ "success": true, "data": { "message": "Base deleted" } }
```

> The `DELETE` fails with `409 Conflict` if there are members associated.

---

### 3.4 Contracts Endpoints (SuperAdmin only)

Same schema as Bases:

- `GET /api/v1/contracts`
- `POST /api/v1/contracts`
- `PUT /api/v1/contracts/:id`
- `DELETE /api/v1/contracts/:id`

---

### 3.5 Grades Endpoints (SuperAdmin only, v1.2)

#### `GET /api/v1/grades`

**Query params:**

- `ruolo` (optional) — filter by role: `pilot` | `cabin_crew`

**Response 200:**

```json
{
  "success": true,
  "data": [
    { "id": "uuid", "codice": "CMD", "nome": "Commander", "ruolo": "pilot" },
    { "id": "uuid", "codice": "FO", "nome": "First Officer", "ruolo": "pilot" },
    {
      "id": "uuid",
      "codice": "RDC",
      "nome": "Cabin Manager",
      "ruolo": "cabin_crew"
    }
  ]
}
```

#### `POST /api/v1/grades`

**Request:**

```json
{ "codice": "SO", "nome": "Second Officer", "ruolo": "pilot" }
```

#### `PUT /api/v1/grades/:id`

**Request:**

```json
{ "codice": "SO", "nome": "Second Officer (updated)", "ruolo": "pilot" }
```

#### `DELETE /api/v1/grades/:id`

**Response 200:**

```json
{ "success": true, "data": { "message": "Grade deleted" } }
```

> The `DELETE` fails with `409 Conflict` if there are members associated with that grade.

---

### 3.6 Dashboard / Statistics

#### `GET /api/v1/dashboard/stats`

**Headers:** `Authorization: Bearer <token>` (admin/superadmin)

**Response 200:**

```json
{
  "success": true,
  "data": {
    "totalMembers": 1250,
    "membersByBase": [
      { "base": "Milano Malpensa", "count": 450 },
      { "base": "Roma Fiumicino", "count": 380 }
    ],
    "membersByContract": [
      { "contratto": "Pilots Alitalia", "count": 600 },
      { "contratto": "Cabin Crew", "count": 650 }
    ],
    "recentMembers": 15,
    "itudCount": 234,
    "rsaCount": 89
  }
}
```

---

## 4. Authentication and Authorization

### 4.1 JWT Strategy

- **Access token:** HS256, duration **15 minutes**
- **Refresh token:** random UUID v4, duration **30 days**, stored in `refresh_tokens`
- **JWT Payload:**

```json
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "role": "admin",
  "iat": 1700000000,
  "exp": 1700000900
}
```

### 4.2 Passport.js JWT Strategy

```typescript
// src/auth/strategies/jwt.strategy.ts
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { UsersService } from "../../users/users.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get("jwt.secret"),
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    const user = await this.usersService.findOne(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException("Account disabled");
    }
    return user;
  }
}
```

### 4.3 RolesGuard

```typescript
// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "../decorators/roles.decorator";

export enum UserRole {
  USER = "user",
  ADMIN = "admin",
  SUPERADMIN = "superadmin",
}

const roleHierarchy: Record<UserRole, number> = {
  [UserRole.SUPERADMIN]: 3,
  [UserRole.ADMIN]: 2,
  [UserRole.USER]: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some(
      (role) => roleHierarchy[user.role as UserRole] >= roleHierarchy[role],
    );
  }
}
```

### 4.4 Routes with Middleware

```typescript
// start/routes.ts
import router from "@adonisjs/core/services/router";
import { middleware } from "#start/kernel";

// Auth (public)
router
  .group(() => {
    router.post("/login", [AuthController, "login"]);
    router.post("/refresh", [AuthController, "refresh"]);
  })
  .prefix("/api/v1/auth");

// Auth (protected)
router
  .group(() => {
    router.post("/logout", [AuthController, "logout"]);
    router.get("/me", [AuthController, "me"]);
  })
  .prefix("/api/v1/auth")
  .use(middleware.auth());

// Members (authenticated)
router
  .group(() => {
    router.post("/upload-pdf", [MembersController, "uploadPdf"]);
    router.get("/", [MembersController, "index"]);
    router.post("/", [MembersController, "store"]);
    router.get("/:id", [MembersController, "show"]);
    router.put("/:id", [MembersController, "update"]);
    router.delete("/:id", [MembersController, "destroy"]);
  })
  .prefix("/api/v1/members")
  .use(middleware.auth());

// Bases, Contracts & Grades (superadmin only)
router
  .resource("/api/v1/bases", BasesController)
  .use("*", [middleware.auth(), middleware.role({ roles: ["superadmin"] })]);

router
  .resource("/api/v1/contracts", ContractsController)
  .use("*", [middleware.auth(), middleware.role({ roles: ["superadmin"] })]);

router
  .resource("/api/v1/grades", GradesController)
  .use("*", [middleware.auth(), middleware.role({ roles: ["superadmin"] })]);

// GET /grades is also accessible by admin (for the select in the member form)
router
  .get("/api/v1/grades", [GradesController, "index"])
  .use([middleware.auth()]);

// Dashboard
router
  .get("/api/v1/dashboard/stats", [DashboardController, "stats"])
  .use([middleware.auth(), middleware.role({ roles: ["admin"] })]);
```

### 4.5 UserPolicy (ex MemberPolicy — v1.1+)

```typescript
// app/policies/user_policy.ts
import User from "#models/user";
import { BasePolicy } from "@adonisjs/bouncer";
import { AuthorizerResponse } from "@adonisjs/bouncer/types";

export default class UserPolicy extends BasePolicy {
  view(authUser: User, targetUser: User): AuthorizerResponse {
    if (authUser.role === "superadmin") return true;
    // Admin can only view members of their own role
    if (authUser.role === "admin") {
      return authUser.ruolo === targetUser.ruolo;
    }
    // User can only view themselves
    return authUser.id === targetUser.id;
  }

  update(authUser: User, targetUser: User): AuthorizerResponse {
    if (authUser.role === "superadmin") return true;
    if (authUser.role === "admin") {
      return authUser.ruolo === targetUser.ruolo;
    }
    return authUser.id === targetUser.id;
  }

  delete(authUser: User): AuthorizerResponse {
    return authUser.role === "superadmin";
  }
}
```

---

## 5. PDF Parsing

### 5.1 Extraction Strategy

Three-tier approach with role-based field mapping:

```
PDF Upload
     │
     ▼
┌─────────────────────────────────────────────┐
│ 1. PDF Form Field Extraction             │ ← Primary: Read AcroForm fields
│    Uses role-specific field mapping       │    from pdf_field_mappings table
└───────────┬─────────────────────────────────┘
            │
     ┌──────┴──────┐
     ▼             ▼
  Success      No fields / Empty
     │             │
     │      ┌──────┴──────────────┐
     │      │ 2. OCR Fallback     │ ← Secondary: Pattern matching on raw text
     │      │    Uses OCR patterns │    Uses regex patterns from mapping config
     │      └──────┬──────────────┘
     │             │
     │      ┌──────┴──────┐
     │      ▼             ▼
     │   Success      Failed/empty
     │      │             │
     │      │      ┌──────┴──────────┐
     │      │      │ 3. Manual Input │ ← Returns empty result
     └──────┴──────┴───────────────────┘
                      │
                      ▼
            Return ExtractionResult
            with extraction_method field
```

### 5.2 Recommended Libraries

| Library                   | Pros                                        | Cons                       | Recommendation                     |
| ------------------------- | ------------------------------------------- | -------------------------- | ---------------------------------- |
| **pdf-parse**             | Simple, lightweight, extracts raw text      | No form fields support     | For OCR fallback                   |
| **pdf-lib**               | Reads/writes PDFs, accesses AcroForm fields | Does not extract free text | **Primary choice** for filled PDFs |
| **tesseract.js**          | Client-side OCR, no server cost             | Slower, less accurate      | Optional client-side fallback      |
| **sharp** + **tesseract** | Server OCR, more accurate                   | Adds latency/cost          | For scanned PDFs                   |

**Recommended strategy:** `pdf-lib` (form fields) → pattern matching (raw text) → manual entry.

### 5.3 Database Schema for Field Mappings

New table for SuperAdmin to configure field mappings per role:

```typescript
// Database migration for pdf_field_mappings
// create_pdf_field_mappings_table.ts

export async function up(db: Knex) {
  await db.schema.createTable("pdf_field_mappings", (table) => {
    table.uuid("id").primary().defaultTo(db.raw("uuid_generate_v4()"));
    table.enum("role", ["pilot", "cabin_crew"]).notNullable();
    table.string("pdf_field_name").notNullable(); // e.g., "nome", "first_name"
    table.string("member_field").notNullable(); // e.g., "nome", "cognome", "crewcode"
    table.enum("extraction_type", ["pdf_field", "ocr_pattern"]).notNullable();
    table.string("ocr_pattern").nullable(); // Regex for OCR, e.g., "Crew Code:\\s*(\\w+)"
    table.boolean("required").defaultTo(false);
    table.timestamps(true, true);

    // Unique constraint: one mapping per role + pdf_field_name
    table.unique(["role", "pdf_field_name"]);
  });
}
```

**Default seed data for pilot forms:**

```typescript
const pilotMappings = [
  {
    role: "pilot",
    pdf_field_name: "nome",
    member_field: "nome",
    extraction_type: "pdf_field",
    required: true,
  },
  {
    role: "pilot",
    pdf_field_name: "cognome",
    member_field: "cognome",
    extraction_type: "pdf_field",
    required: true,
  },
  {
    role: "pilot",
    pdf_field_name: "crewcode",
    member_field: "crewcode",
    extraction_type: "pdf_field",
    required: true,
  },
  {
    role: "pilot",
    pdf_field_name: "email",
    member_field: "email",
    extraction_type: "pdf_field",
    required: true,
  },
  {
    role: "pilot",
    pdf_field_name: "telefono",
    member_field: "telefono",
    extraction_type: "pdf_field",
    required: false,
  },
  {
    role: "pilot",
    pdf_field_name: "base",
    member_field: "baseCode",
    extraction_type: "pdf_field",
    required: false,
  },
  // OCR patterns for scanned forms
  {
    role: "pilot",
    pdf_field_name: "ocr_crewcode",
    member_field: "crewcode",
    extraction_type: "ocr_pattern",
    ocr_pattern: "Crew Code:\\s*([A-Z0-9]{3,10})",
    required: false,
  },
  {
    role: "pilot",
    pdf_field_name: "ocr_nome",
    member_field: "nome",
    extraction_type: "ocr_pattern",
    ocr_pattern: "Nome:\\s*([A-Za-z\\s]+)",
    required: false,
  },
];
```

**Default seed data for cabin crew forms:**

```typescript
const cabinCrewMappings = [
  {
    role: "cabin_crew",
    pdf_field_name: "first_name",
    member_field: "nome",
    extraction_type: "pdf_field",
    required: true,
  },
  {
    role: "cabin_crew",
    pdf_field_name: "last_name",
    member_field: "cognome",
    extraction_type: "pdf_field",
    required: true,
  },
  {
    role: "cabin_crew",
    pdf_field_name: "employee_id",
    member_field: "crewcode",
    extraction_type: "pdf_field",
    required: true,
  },
  {
    role: "cabin_crew",
    pdf_field_name: "email",
    member_field: "email",
    extraction_type: "pdf_field",
    required: true,
  },
  {
    role: "cabin_crew",
    pdf_field_name: "phone",
    member_field: "telefono",
    extraction_type: "pdf_field",
    required: false,
  },
  // OCR patterns
  {
    role: "cabin_crew",
    pdf_field_name: "ocr_employee_id",
    member_field: "crewcode",
    extraction_type: "ocr_pattern",
    ocr_pattern: "Employee ID:\\s*([A-Z0-9]{3,10})",
    required: false,
  },
];
```

### 5.4 PdfParserService

```typescript
// app/services/pdf_parser_service.ts
import { PDFDocument } from "pdf-lib";
import pdfParse from "pdf-parse";
import { readFile } from "node:fs/promises";

export interface ParsedMemberData {
  nome?: string;
  cognome?: string;
  email?: string;
  crewcode?: string;
  telefono?: string;
  grade?: string;
  baseCode?: string;
  contrattoCode?: string;
  confidence: number;
}

// Maps PDF field names to model fields
// Adapt based on the actual PDF
const FIELD_MAP: Record<string, keyof ParsedMemberData> = {
  Nome: "nome",
  Cognome: "cognome",
  Email: "email",
  Matricola: "crewcode",
  Telefono: "telefono",
  Qualifica: "grade",
  Base: "baseCode",
  Contratto: "contrattoCode",
  // Common variants
  first_name: "nome",
  last_name: "cognome",
  crew_code: "crewcode",
  phone: "telefono",
};

export default class PdfParserService {
  async parse(filePath: string): Promise<ParsedMemberData> {
    const buffer = await readFile(filePath);

    // Attempt 1: read AcroForm fields (filled PDF)
    const fromForm = await this.parseFormFields(buffer);
    if (fromForm.confidence > 0.5) return fromForm;

    // Attempt 2: extract raw text and use regex
    const fromText = await this.parseRawText(buffer);
    return fromText;
  }

  private async parseFormFields(buffer: Buffer): Promise<ParsedMemberData> {
    const result: ParsedMemberData = { confidence: 0 };
    let filledFields = 0;
    let totalFields = 0;

    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const form = pdfDoc.getForm();
      const fields = form.getFields();
      totalFields = fields.length;

      for (const field of fields) {
        const fieldName = field.getName();
        const mappedKey = FIELD_MAP[fieldName];

        if (!mappedKey) continue;

        let value: string | undefined;

        try {
          if (field.constructor.name === "PDFTextField") {
            value = (field as any).getText()?.trim();
          } else if (field.constructor.name === "PDFDropdown") {
            value = (field as any).getSelected()?.[0]?.trim();
          }
        } catch {
          continue;
        }

        if (value) {
          (result as any)[mappedKey] = value;
          filledFields++;
        }
      }

      result.confidence = totalFields > 0 ? filledFields / totalFields : 0;
    } catch (err) {
      result.confidence = 0;
    }

    return result;
  }

  private async parseRawText(buffer: Buffer): Promise<ParsedMemberData> {
    const result: ParsedMemberData = { confidence: 0 };

    try {
      const data = await pdfParse(buffer);
      const text = data.text;

      // Regex patterns for extracting data from structured text
      const patterns: Array<{ key: keyof ParsedMemberData; regex: RegExp }> = [
        {
          key: "nome",
          regex: /(?:Nome|First Name)[:\s]+([A-Za-zÀ-ÿ\s]+?)(?:\n|$)/i,
        },
        {
          key: "cognome",
          regex: /(?:Cognome|Last Name)[:\s]+([A-Za-zÀ-ÿ\s]+?)(?:\n|$)/i,
        },
        {
          key: "email",
          regex: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
        },
        {
          key: "crewcode",
          regex: /(?:Matricola|Crew Code)[:\s]+([A-Z0-9]{3,15})/i,
        },
        {
          key: "telefono",
          regex: /(?:Tel|Telefono|Phone)[:\s]+(\+?[\d\s\-().]{8,20})/i,
        },
        {
          key: "grade",
          regex: /(?:Qualifica|Grado|Rank)[:\s]+([A-Za-zÀ-ÿ\s]+?)(?:\n|$)/i,
        },
        { key: "baseCode", regex: /(?:Base)[:\s]+([A-Z]{3})/i },
      ];

      let matched = 0;
      for (const { key, regex } of patterns) {
        const match = text.match(regex);
        if (match?.[1]) {
          (result as any)[key] = match[1].trim();
          matched++;
        }
      }

      result.confidence = matched / patterns.length;
    } catch {
      result.confidence = 0;
    }

    return result;
  }
}
```

### 5.3 Upload Controller (snippet)

```typescript
// app/controllers/members_controller.ts (metodo uploadPdf)
async uploadPdf({ request, auth, response }: HttpContext) {
  const file = request.file('file', {
    size: '10mb',
    extnames: ['pdf'],
  })

  if (!file || !file.isValid) {
    return response.badRequest({
      success: false,
      error: { code: 'INVALID_FILE', message: file?.errors?.[0]?.message ?? 'Invalid file' },
    })
  }

  const filename = `${cuid()}.pdf`
  const uploadPath = app.makePath('storage/uploads/pdfs')
  await file.move(uploadPath, { name: filename })

  // Async parsing but we wait for the result for form pre-fill
  const parser = new PdfParserService()
  const parsedData = await parser.parse(`${uploadPath}/${filename}`)

  const upload = await MemberPdfUpload.create({
    filename: file.clientName,
    filepath: `${uploadPath}/${filename}`,
    parsedData,
    status: 'processed',
    uploadedBy: auth.user!.id,
  })

  return response.ok({ success: true, data: { uploadId: upload.id, parsedData } })
}
```

---

## 6. Email and WhatsApp Notifications

### 6.1 Email with Resend

**Why Resend:** generous free tier (3,000 emails/month), native TypeScript SDK, excellent deliverability.

```bash
npm install resend
```

#### EmailService

```typescript
// app/services/email_service.ts
import { Resend } from "resend";
import env from "#start/env";

const resend = new Resend(env.get("RESEND_API_KEY"));

interface WelcomeEmailData {
  to: string;
  nome: string;
  cognome: string;
  email: string;
  crewcode?: string;
  baseName?: string;
}

export default class EmailService {
  async sendWelcome(data: WelcomeEmailData): Promise<void> {
    await resend.emails.send({
      from: "UnionConnect <noreply@unionconnect.it>",
      to: data.to,
      subject: "Welcome to UnionConnect!",
      html: this.welcomeTemplate(data),
    });
  }

  private welcomeTemplate(data: WelcomeEmailData): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px;
                 padding: 40px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    .header { background: #1e40af; color: white; padding: 20px; border-radius: 6px;
              text-align: center; margin-bottom: 30px; }
    .field { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
    .label { font-weight: bold; color: #374151; }
    .footer { margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Welcome to UnionConnect</h1>
      <p>Your membership has been successfully registered</p>
    </div>
    <p>Dear <strong>${data.nome} ${data.cognome}</strong>,</p>
    <p>We are pleased to confirm your union membership registration.</p>
    <div class="field"><span class="label">Email:</span> ${data.email}</div>
    ${data.crewcode ? `<div class="field"><span class="label">Crew Code:</span> ${data.crewcode}</div>` : ""}
    ${data.baseName ? `<div class="field"><span class="label">Base:</span> ${data.baseName}</div>` : ""}
    <p>For assistance, please contact your union representative.</p>
    <div class="footer">UnionConnect — Union Membership Management</div>
  </div>
</body>
</html>
    `.trim();
  }
}
```

---

### 6.2 WhatsApp with Twilio

**Why Twilio:** Consolidated API, free sandbox for development, excellent Node.js SDK.
**Alternative:** Direct WhatsApp Business API (cheaper in production but more complex setup).

```bash
npm install twilio
```

#### WhatsAppService

```typescript
// app/services/whatsapp_service.ts
import twilio from "twilio";
import env from "#start/env";

const client = twilio(
  env.get("TWILIO_ACCOUNT_SID"),
  env.get("TWILIO_AUTH_TOKEN"),
);

interface WelcomeWhatsAppData {
  telefono: string;
  nome: string;
  cognome: string;
  crewcode?: string;
}

export default class WhatsAppService {
  async sendWelcome(data: WelcomeWhatsAppData): Promise<void> {
    if (!data.telefono) return;

    const normalizedPhone = this.normalizePhone(data.telefono);
    if (!normalizedPhone) return;

    await client.messages.create({
      from: `whatsapp:${env.get("TWILIO_WHATSAPP_NUMBER")}`,
      to: `whatsapp:${normalizedPhone}`,
      body: this.welcomeMessage(data),
    });
  }

  private welcomeMessage(data: WelcomeWhatsAppData): string {
    return [
      `Hi ${data.nome} ${data.cognome}! 👋`,
      ``,
      `Your membership with *UnionConnect* has been successfully registered.`,
      data.crewcode ? `Crew Code: *${data.crewcode}*` : "",
      ``,
      `For assistance, please contact your union representative.`,
      ``,
      `_UnionConnect — Union Membership Management_`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  private normalizePhone(phone: string): string | null {
    // Remove spaces, hyphens, parentheses
    const cleaned = phone.replace(/[\s\-().]/g, "");
    // Ensure it starts with +
    if (cleaned.startsWith("+")) return cleaned;
    if (cleaned.startsWith("0039")) return "+39" + cleaned.slice(4);
    if (cleaned.startsWith("39")) return "+" + cleaned;
    return null;
  }
}
```

---

### 6.3 Queue with BullMQ

**Why BullMQ:** Redis-backed, automatic retries, delayed jobs, priority queues.

```bash
npm install bullmq ioredis
```

#### NotificationQueue

```typescript
// app/queues/notification_queue.ts
import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";
import env from "#start/env";
import EmailService from "#services/email_service";
import WhatsAppService from "#services/whatsapp_service";

const connection = new IORedis(env.get("REDIS_URL"), {
  maxRetriesPerRequest: null,
});

export const notificationQueue = new Queue("notifications", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
  },
});

// Separate worker (started in a dedicated process or via AdonisJS commands)
export const notificationWorker = new Worker(
  "notifications",
  async (job: Job) => {
    const emailService = new EmailService();
    const whatsappService = new WhatsAppService();

    switch (job.name) {
      case "welcome-email":
        await emailService.sendWelcome(job.data);
        break;
      case "welcome-whatsapp":
        await whatsappService.sendWelcome(job.data);
        break;
      default:
        throw new Error(`Unknown job: ${job.name}`);
    }
  },
  { connection },
);

notificationWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed:`, err.message);
});
```

#### Usage in MembersService

```typescript
// After member creation
await notificationQueue.add("welcome-email", {
  to: member.email,
  nome: member.nome,
  cognome: member.cognome,
  email: member.email,
  crewcode: member.crewcode,
  baseName: member.base?.nome,
});

await notificationQueue.add("welcome-whatsapp", {
  telefono: member.telefono,
  nome: member.nome,
  cognome: member.cognome,
  crewcode: member.crewcode,
});
```

---

## 7. NestJS Project Structure

```
api/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   ├── dto/
│   │   │   └── auth.dto.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts
│   │   │   └── roles.decorator.ts
│   │   └── strategies/
│   │       └── jwt.strategy.ts
│   ├── users/
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── users.module.ts
│   │   ├── dto/
│   │   │   ├── create-user.dto.ts
│   │   │   └── update-user.dto.ts
│   │   └── entities/
│   │       └── user.entity.ts
│   ├── bases/
│   │   ├── bases.controller.ts
│   │   ├── bases.service.ts
│   │   ├── bases.module.ts
│   │   ├── dto/
│   │   │   └── create-base.dto.ts
│   │   └── entities/
│   │       └── base.entity.ts
│   ├── contracts/
│   │   ├── contracts.controller.ts
│   │   ├── contracts.service.ts
│   │   ├── contracts.module.ts
│   │   └── entities/
│   │       └── contract.entity.ts
│   ├── grades/
│   │   ├── grades.controller.ts
│   │   ├── grades.service.ts
│   │   ├── grades.module.ts
│   │   └── entities/
│   │       └── grade.entity.ts
│   ├── common/
│   │   ├── entities/
│   │   │   └── base.entity.ts
│   │   └── enums/
│   │       └── role.enum.ts
│   ├── database/
│   │   ├── migrations/
│   │   └── seeds/
│   │       ├── run-seed.ts
│   │       └── initial.seed.ts
│   ├── config/
│   │   ├── database.config.ts
│   │   └── jwt.config.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   └── main.ts
├── test/
├── nest-cli.json
├── tsconfig.json
├── package.json
└── .env
```

### Entity: `user.entity.ts` (TypeORM — unified table v1.1+)

```typescript
// src/users/entities/user.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Base } from '../../bases/entities/base.entity'
import { Contract } from '../../contracts/entities/contract.entity'
import { Grade } from '../../grades/entities/grade.entity'
import { Role } from '../../common/enums/role.enum'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  // Authentication
  @Column({ unique: true, length: 50 })
  crewcode: string

  @Column({ length: 255 })
  password: string

  @Column({
    type: 'enum',
    enum: Role,
    default: Role.USER,
  })
  role: Role

  @Column({ default: true })
  mustChangePassword: boolean

  @Column({ default: true })
  isActive: boolean

  // Professional data
  @Column({ type: 'enum', enum: ['pilot', 'cabin_crew'], nullable: true })
  ruolo: 'pilot' | 'cabin_crew' | null

  @Column({ length: 100 })
  nome: string

  @Column({ length: 100 })
  cognome: string

  @Column({ unique: true, length: 255 })
  email: string

  @Column({ length: 30, nullable: true })
  telefono: string | null

  // Relations
  @ManyToOne(() => Base, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'base_id' })
  base: Base

  @Column({ nullable: true })
  base_id: string

  @ManyToOne(() => Contract, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'contratto_id' })
  contratto: Contract

  @Column({ nullable: true })
  contratto_id: string

  @ManyToOne(() => Grade, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'grade_id' })
  grade: Grade

  @Column({ nullable: true })
  grade_id: string

  // Sensitive fields
  @Column({ type: 'text', nullable: true })
  note: string | null

  @Column({ default: false })
  itud: boolean

  @Column({ default: false })
  rsa: boolean

  // Timestamps
  @CreateDateColumn({ type: 'timestamptz' })
  created_at: Date

  @UpdateDateColumn({ type: 'timestamptz' })
  updated_at: Date
}

  // Serialize removing sensitive fields for user role
  serializeForRole(role: 'superadmin' | 'admin' | 'user') {
    const data = this.serialize()
    if (role === 'user') {
      delete data.note
      delete data.itud
      delete data.rsa
    }
    return data
  }
}
```

### Entity: `grade.entity.ts` (TypeORM v1.2)

```typescript
// src/grades/entities/grade.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("grades")
export class Grade {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true, length: 20 })
  codice: string;

  @Column({ length: 255 })
  nome: string;

  @Column({ type: "enum", enum: ["pilot", "cabin_crew"] })
  ruolo: "pilot" | "cabin_crew";

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updated_at: Date;
}
```

### ~~Model: `member.ts`~~ — REMOVED (v1.1)

> The Member model no longer exists. All data is in the User model above.

### Controller: `users.controller.ts` (NestJS — operates on User entity v1.1+)

```typescript
// src/users/users.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../auth/guards/roles.guard'
import { Roles } from '../auth/decorators/roles.decorator'
import { Role } from '../common/enums/role.enum'

@Controller('api/v1/members')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async findAll(
    @Query('page') page: number = 1,
    @Query('perPage') perPage: number = 20,
    @Query('search') search?: string,
    @Query('base_id') baseId?: string,
    @Query('grade_id') gradeId?: string,
    @Request() req
  ) {
    perPage = Math.min(perPage, 100)
    return this.usersService.findAll({
      page,
      perPage,
      search,
      baseId,
      gradeId,
      requestingUser: req.user,
    })
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.USER)
  async findOne(@Param('id') id: string, @Request() req) {
    return this.usersService.findOne(id, req.user)
  }

  @Post()
  @Roles(Role.ADMIN, Role.SUPERADMIN)
  async create(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.usersService.create(createUserDto, req.user)
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.SUPERADMIN, Role.USER)
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req
  ) {
    return this.usersService.update(id, updateUserDto, req.user)
  }

  @Delete(':id')
  @Roles(Role.SUPERADMIN)
  async remove(@Param('id') id: string) {
    return this.usersService.remove(id)
  }
}
    if (gradeId) query.where('grade_id', gradeId)

    const members = await query.paginate(page, perPage)

    const role = auth.user!.role
    return response.ok({
      success: true,
      data: members.all().map((m) => m.serializeForRole(role)),
      meta: members.getMeta(),
    })
  }

  async show({ params, auth, response, bouncer }: HttpContext) {
    const member = await User.query()
      .where('id', params.id)
      .preload('base')
      .preload('contratto')
      .preload('grade')
      .firstOrFail()

    await bouncer.with(UserPolicy).authorize('view', member)

    return response.ok({
      success: true,
      data: member.serializeForRole(auth.user!.role),
    })
  }

  async store({ request, auth, response }: HttpContext) {
    const data = await request.validateUsing(createMemberValidator)

    // Admin scoped: enforce admin's own role
    if (auth.user!.role === 'admin' && auth.user!.ruolo) {
      data.ruolo = auth.user!.ruolo
    }

    const user = await User.create({
      ...data,
      password: await hash.make('password'), // default password
      role: 'user',
      mustChangePassword: true,
    })

    await user.load('base')
    await user.load('contratto')
    await user.load('grade')

    // Queue welcome notifications
    await notificationQueue.add('welcome-email', {
      to: user.email, nome: user.nome, cognome: user.cognome,
      email: user.email, crewcode: user.crewcode, baseName: user.base?.nome,
    })
    await notificationQueue.add('welcome-whatsapp', {
      telefono: user.telefono, nome: user.nome, cognome: user.cognome,
      crewcode: user.crewcode,
    })

    return response.created({ success: true, data: user.serialize() })
  }

  async update({ params, request, auth, response, bouncer }: HttpContext) {
    const member = await User.findOrFail(params.id)
    await bouncer.with(UserPolicy).authorize('update', member)

    const data = await request.validateUsing(updateMemberValidator)

    // Users with role 'user' cannot modify sensitive fields
    const filteredData = auth.user!.role === 'user'
      ? this.filterUserFields(data)
      : data

    member.merge(filteredData)
    await member.save()
    await member.load('base')
    await member.load('contratto')
    await member.load('grade')

    return response.ok({ success: true, data: member.serializeForRole(auth.user!.role) })
  }

  async destroy({ params, response, bouncer, auth }: HttpContext) {
    const member = await User.findOrFail(params.id)
    await bouncer.with(UserPolicy).authorize('delete', auth.user!)

    await member.delete()
    return response.ok({ success: true, data: { message: 'Member deleted' } })
  }

  private filterUserFields(data: Record<string, any>) {
    const { note, itud, rsa, email, crewcode, baseId, contrattoId, gradeId, ...allowed } = data
    return allowed
  }
}
```

---

## 8. Class-Validator DTOs

NestJS uses `class-validator` and `class-transformer` for input validation. Apply `ValidationPipe` globally in `main.ts`.

```typescript
// src/main.ts
import { ValidationPipe } from "@nestjs/common";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.listen(3000);
}
```

### CreateUserDto

```typescript
// src/users/dto/create-user.dto.ts
import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsUUID,
  MinLength,
  MaxLength,
} from "class-validator";

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nome: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  cognome: string;

  @IsEmail()
  email: string;

  @IsString()
  @MaxLength(50)
  crewcode: string;

  @IsString()
  @IsOptional()
  @MaxLength(30)
  telefono?: string;

  @IsEnum(["pilot", "cabin_crew"])
  ruolo: "pilot" | "cabin_crew";

  @IsUUID()
  @IsOptional()
  base_id?: string;

  @IsUUID()
  @IsOptional()
  contratto_id?: string;

  @IsUUID()
  @IsOptional()
  grade_id?: string;

  @IsString()
  @IsOptional()
  note?: string;

  @IsOptional()
  itud?: boolean;

  @IsOptional()
  rsa?: boolean;
}
```

### UpdateUserDto

```typescript
// src/users/dto/update-user.dto.ts
import { PartialType } from "@nestjs/mapped-types";
import { CreateUserDto } from "./create-user.dto";

export class UpdateUserDto extends PartialType(CreateUserDto) {}
```

### LoginDto

```typescript
// src/auth/dto/login.dto.ts
import { IsString, MaxLength } from "class-validator";

export class LoginDto {
  @IsString()
  @MaxLength(50)
  crewcode: string;

  @IsString()
  password: string;
}
```

### CreateBaseDto

```typescript
// src/bases/dto/create-base.dto.ts
import { IsString, MaxLength } from "class-validator";

export class CreateBaseDto {
  @IsString()
  @MaxLength(20)
  codice: string;

  @IsString()
  @MaxLength(255)
  nome: string;
}
```

---

## 9. Security

### 9.1 Rate Limiting

```typescript
// config/limiter.ts (usando @adonisjs/limiter)
import { defineConfig } from "@adonisjs/limiter";

export default defineConfig({
  default: "redis",
  stores: {
    redis: {
      client: "redis",
      connectionName: "main",
    },
  },
});
```

```typescript
// start/routes.ts — apply rate limiting to auth endpoints
import limiter from "@adonisjs/limiter/services/main";

router.group(() => {
  router.post("/login", [AuthController, "login"]).use(
    limiter.use({
      requests: 10,
      duration: "15 minutes",
      limitExceeded: "exception",
    }),
  );
  router.post("/refresh", [AuthController, "refresh"]).use(
    limiter.use({
      requests: 30,
      duration: "15 minutes",
      limitExceeded: "exception",
    }),
  );
});

// PDF upload: limit to prevent abuse
router
  .post("/api/v1/members/upload-pdf", [MembersController, "uploadPdf"])
  .use([
    middleware.auth(),
    limiter.use({
      requests: 20,
      duration: "1 hour",
      limitExceeded: "exception",
    }),
  ]);
```

### 9.2 CORS

```typescript
// config/cors.ts
import { defineConfig } from "@adonisjs/cors";

export default defineConfig({
  enabled: true,
  origin: [process.env.FRONTEND_URL ?? "http://localhost:3000"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  headers: ["Content-Type", "Authorization"],
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
});
```

### 9.3 Helmet (Security Headers)

```bash
npm install helmet
```

```typescript
// start/kernel.ts
import helmet from "helmet";
import server from "@adonisjs/core/services/server";

server.use([
  () => import("#middleware/container_bindings_middleware"),
  () => import("@adonisjs/core/bodyparser_middleware"),
  async () => {
    const { default: h } = await import("helmet");
    return h();
  },
]);
```

### 9.4 Input Sanitization

- VineJS automatically applies `.trim()` on all declared string fields
- Lucid queries use prepared parameters (no SQL injection possible)
- PDF files are validated by extension and MIME type
- Data extracted from PDF is re-validated with `createMemberValidator` before being saved

### 9.5 Environment Variables

```env
# .env.example
APP_KEY=<generated with node ace generate:key>
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=unionconnect
DB_PASSWORD=<password>
DB_DATABASE=unionconnect

# JWT
JWT_SECRET=<random 256-bit string>
JWT_EXPIRES_IN=900
JWT_REFRESH_EXPIRES_IN=2592000

# Redis
REDIS_URL=redis://localhost:6379

# Resend (email)
RESEND_API_KEY=re_xxxxxxxxx

# Twilio (WhatsApp)
TWILIO_ACCOUNT_SID=ACxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxx
TWILIO_WHATSAPP_NUMBER=+14155238886

# Frontend
FRONTEND_URL=https://app.unionconnect.it
```

---

## 10. Seed Data

TypeORM seeding is implemented using a custom seed runner that uses the NestJS DI container.

### `src/database/seeds/initial.seed.ts`

```typescript
import { DataSource } from "typeorm";
import { Base } from "../../bases/entities/base.entity";
import { Contract } from "../../contracts/entities/contract.entity";
import { Grade } from "../../grades/entities/grade.entity";
import { User } from "../../users/entities/user.entity";
import { Role } from "../../common/enums/role.enum";
import * as bcrypt from "bcrypt";

export class InitialSeed {
  async run(dataSource: DataSource): Promise<void> {
    // Seed bases
    const baseRepository = dataSource.getRepository(Base);
    await baseRepository.save([
      { codice: "MXP", nome: "Milano Malpensa" },
      { codice: "LIN", nome: "Milano Linate" },
      { codice: "FCO", nome: "Roma Fiumicino" },
      { codice: "NAP", nome: "Napoli Capodichino" },
      { codice: "BLQ", nome: "Bologna Guglielmo Marconi" },
      { codice: "VCE", nome: "Venezia Marco Polo" },
      { codice: "TRN", nome: "Torino Caselle" },
      { codice: "CTA", nome: "Catania Fontanarossa" },
      { codice: "PMO", nome: "Palermo Falcone e Borsellino" },
      { codice: "BRI", nome: "Bari Karol Wojtyla" },
    ]);

    // Seed contracts
    const contractRepository = dataSource.getRepository(Contract);
    await contractRepository.save([
      { codice: "AZ-PI", nome: "ITA Airways — Pilots" },
      { codice: "AZ-ADV", nome: "ITA Airways — Cabin Crew" },
      { codice: "RY-PI", nome: "Ryanair — Pilots" },
      { codice: "RY-ADV", nome: "Ryanair — Cabin Crew" },
    ]);

    // Seed grades
    const gradeRepository = dataSource.getRepository(Grade);
    await gradeRepository.save([
      // Pilots
      { codice: "CMD", nome: "Commander", ruolo: "pilot" },
      { codice: "FO", nome: "First Officer", ruolo: "pilot" },
      { codice: "SO", nome: "Second Officer", ruolo: "pilot" },
      { codice: "ALL", nome: "Cadet", ruolo: "pilot" },
      // Cabin Crew
      { codice: "RDC", nome: "Cabin Manager", ruolo: "cabin_crew" },
      { codice: "SEN", nome: "Senior Cabin Crew", ruolo: "cabin_crew" },
      { codice: "ADV", nome: "Flight Attendant", ruolo: "cabin_crew" },
    ]);

    // Seed admin users
    const userRepository = dataSource.getRepository(User);
    const hashedPassword = await bcrypt.hash("ChangeMe2024!", 10);

    await userRepository.save([
      {
        crewcode: "SADMIN01",
        nome: "Admin",
        cognome: "Super",
        email: "superadmin@unionconnect.it",
        password: hashedPassword,
        role: Role.SUPERADMIN,
        ruolo: null,
        isActive: true,
        mustChangePassword: true,
      },
      {
        crewcode: "ADMIN01",
        nome: "Marco",
        cognome: "Rossi",
        email: "admin.piloti@unionconnect.it",
        password: hashedPassword,
        role: Role.ADMIN,
        ruolo: "pilot",
        isActive: true,
        mustChangePassword: true,
      },
    ]);
  }
}
```

### `src/database/seeds/run-seed.ts`

```typescript
import { DataSource } from "typeorm";
import { databaseConfig } from "../../config/database.config";
import { InitialSeed } from "./initial.seed";

async function runSeed() {
  const dataSource = new DataSource(databaseConfig);
  await dataSource.initialize();

  const seeder = new InitialSeed();
  await seeder.run(dataSource);

  console.log("✅ Seeding completed successfully");
  await dataSource.destroy();
  process.exit(0);
}

runSeed().catch((error) => {
  console.error("❌ Seeding failed:", error);
  process.exit(1);
});
```

**Run the seeds:**

```bash
npm run seed
```

---

## Main Dependencies

```json
{
  "dependencies": {
    "@nestjs/common": "^11.x",
    "@nestjs/core": "^11.x",
    "@nestjs/platform-express": "^11.x",
    "@nestjs/typeorm": "^11.x",
    "@nestjs/config": "^4.x",
    "@nestjs/passport": "^11.x",
    "@nestjs/jwt": "^11.x",
    "typeorm": "^0.3.x",
    "pg": "^8.x",
    "passport": "^0.7.x",
    "passport-jwt": "^4.x",
    "class-validator": "^0.14.x",
    "class-transformer": "^0.5.x",
    "bcrypt": "^5.x",
    "reflect-metadata": "^0.2.x",
    "rxjs": "^7.x",
    "pdf-lib": "^1.17.x",
    "pdf-parse": "^1.1.x",
    "resend": "^3.x",
    "twilio": "^5.x",
    "bullmq": "^5.x",
    "ioredis": "^5.x"
  },
  "devDependencies": {
    "@nestjs/cli": "^11.x",
    "@nestjs/schematics": "^11.x",
    "@nestjs/testing": "^11.x",
    "@types/bcrypt": "^5.x",
    "@types/passport-jwt": "^4.x",
    "@types/pdf-parse": "^1.x",
    "typescript": "^5.x"
  }
}
```

---

_Document generated on: 2026-03-07_
_Versione: 1.4_
