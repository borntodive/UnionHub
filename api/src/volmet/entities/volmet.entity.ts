import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("volmets")
export class Volmet {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 4, unique: true })
  icao: string;

  @Column({ type: "varchar", length: 3, nullable: true })
  iata: string;

  @Column({ type: "varchar", length: 100 })
  name: string;

  @Column({ type: "varchar", length: 100 })
  city: string;

  @Column({ type: "varchar", length: 2 })
  country: string;

  @Column({ type: "decimal", precision: 10, scale: 7, nullable: true })
  latitude: number;

  @Column({ type: "decimal", precision: 11, scale: 7, nullable: true })
  longitude: number;

  @Column({ type: "jsonb", default: "[]" })
  frequencies: string[];

  @Column({ type: "varchar", length: 50 })
  region: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  volmetName: string;

  @Column({ type: "varchar", length: 20, nullable: true })
  atis: string;

  @Column({ type: "varchar", length: 30, nullable: true })
  handlingFrequency: string | null;

  @Column({ type: "boolean", default: true })
  isActive: boolean;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
