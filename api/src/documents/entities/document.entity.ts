import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export type DocumentStatus = 'draft' | 'reviewing' | 'approved' | 'published';

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text' })
  originalContent: string;

  @Column({ type: 'text', nullable: true })
  aiReviewedContent: string | null;

  @Column({ type: 'text', nullable: true })
  englishTranslation: string | null;

  @Column({ type: 'text', nullable: true })
  finalPdfUrl: string;

  @Column({ type: 'text', nullable: true })
  letterheadImageBase64: string | null;

  @Column({
    type: 'enum',
    enum: ['draft', 'reviewing', 'approved', 'published'],
    default: 'draft',
  })
  status: DocumentStatus;

  @Column({ type: 'uuid' })
  createdBy: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  author: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  publishedAt: Date;
}
