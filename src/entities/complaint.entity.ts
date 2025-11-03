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
  @JoinColumn({ name: 'userId' })
  user!: User;

  @Column({ name: 'userId', type: 'uuid' })
  userId!: string;

  @ManyToOne(() => ComplaintBoard, (board) => board.complaints, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'boardId' })
  complaintBoard!: ComplaintBoard;

  @Column({
    name: 'boardId',
    type: 'uuid',
    nullable: false,
  })
  boardId!: string;

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