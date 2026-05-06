import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("runways")
export class Runway {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 4 })
  @Index()
  icao: string;

  @Column({ type: "varchar", length: 10 })
  number: string;

  @Column({ type: "integer" })
  heading: number;

  @Column({ type: "integer", nullable: true })
  length: number | null;

  @Column({ type: "integer", nullable: true })
  width: number | null;

  @Column({ type: "varchar", length: 50, nullable: true })
  surface: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
