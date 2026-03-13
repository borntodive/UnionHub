import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum Ruolo {
  PILOT = 'pilot',
  CABIN_CREW = 'cabin_crew',
}

@Entity('grades')
@Index(['ruolo'])
export class Grade {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20 })
  codice: string;

  @Column({ type: 'varchar', length: 100 })
  nome: string;

  @Column({
    type: 'enum',
    enum: Ruolo,
    enumName: 'ruolo_enum',
  })
  ruolo: Ruolo;

  @OneToMany(() => User, (user) => user.grade)
  users: User[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
