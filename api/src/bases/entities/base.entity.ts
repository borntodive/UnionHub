import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

@Entity("bases")
export class Base {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 20, unique: true })
  codice: string;

  @Column({ type: "varchar", length: 100 })
  nome: string;

  @OneToMany(() => User, (user) => user.base)
  users: User[];

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
