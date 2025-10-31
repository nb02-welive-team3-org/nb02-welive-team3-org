import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ComplaintBoard } from './complaint-board.entity';
import { Comment } from './comment.entity';
import { Notification } from './notification.entity';

export enum ComplaintStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
}

@Entity({ name: 'complaints' })
export class Complaint {
  @PrimaryGeneratedColumn('uuid')
  complaintId!: string;

  @ManyToOne(() => User, (user) => user.complaints, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => ComplaintBoard, (board) => board.complaints, {
  nullable: true,
  onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'board_id' })
  complaintBoard?: ComplaintBoard | null;

  @Column({
    name: 'board_id',
    type: 'uuid',
    nullable: true,
  })
  boardId?: string | null;

  @Column({ length: 100 })
  title!: string;

  @Column({ type: 'text' })
  content!: string;

  @Column({ default: true })
  isPublic!: boolean;

  @Column({
    type: 'enum',
    enum: ComplaintStatus,
    default: ComplaintStatus.PENDING,
  })
  status!: ComplaintStatus;

  @Column({ default: 0 })
  viewsCount!: number;

  @Column({ nullable: true })
  dong?: string;

  @Column({ nullable: true })
  ho?: string;

  @OneToMany(() => Comment, (comment) => comment.complaint, {
    cascade: true,
  })
  comments!: Comment[];

  @OneToMany(() => Notification, (notification) => notification.complaint, {
    cascade: true,
  })
  notifications!: Notification[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}