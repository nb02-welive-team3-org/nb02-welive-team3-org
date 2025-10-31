import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Complaint } from './complaint.entity';
import { Notice } from './notice.entity';

@Entity({ name: 'comments' })
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  content!: string;

  @ManyToOne(() => User, (user) => user.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'text' })
  writerName!: string;

  // 민원
  @ManyToOne(() => Complaint, (complaint) => complaint.comments, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'complaintId' })
  complaint?: Complaint;

  @Column({ type: 'uuid', nullable: true })
  complaintId?: string;

  // 공지사항
  @ManyToOne(() => Notice, (notice) => notice.comments, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'noticeId' })
  notice?: Notice;

  @Column({ type: 'uuid', nullable: true })
  noticeId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}