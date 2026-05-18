import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("app_releases")
export class AppRelease {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  version: string;

  @Column({ nullable: true, type: "varchar" })
  minVersion: string | null;

  @Column({ default: "all" })
  platform: string; // "ios" | "android" | "all"

  @Column({ type: "text", nullable: true })
  releaseNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
