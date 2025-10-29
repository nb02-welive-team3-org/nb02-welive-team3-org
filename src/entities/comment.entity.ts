import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Complaint } from './complaint.entity';
import { Notice } from './notice.entity';

export enum BoardType {
  COMPLAINT = 'COMPLAINT',
  NOTICE = 'NOTICE',
}

@Entity({ name: 'comments' })
@Index(['boardType', 'boardId'])
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  commentId!: string;

  @Column({ type: 'text' })
  content!: string;

  @ManyToOne(() => User, (user) => user.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column()
  writerName!: string;

  @Column({ type: 'enum', enum: BoardType })
  boardType!: BoardType;

  @Column({ type: 'uuid' })
  boardId!: string; // complaintId | noticeId | pollId

  // 민원
  @ManyToOne(() => Complaint, (complaint) => complaint.comments, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'complaint_id' })
  complaint?: Complaint;

  // 공지사항
  @ManyToOne(() => Notice, (notice) => notice.comments, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'notice_id' })
  notice?: Notice;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
