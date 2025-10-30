import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  OneToOne,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Apartment } from './apartment.entity';
import { Resident } from './resident.entity';
import { Complaint } from './complaint.entity';
import { Comment } from './comment.entity';
import { Vote } from './vote.entity';
import { Poll } from './poll.entity';
import { UserNotification } from './user-notification.entity';
import { ApprovalStatus } from './approvalStatus.entity';

// =
// : 사용자
// =

export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  username!: string;

  @Column()
  password!: string;

  @Column()
  name!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ unique: true })
  contact!: string;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({ type: 'enum', enum: UserRole })
  role!: UserRole;

  @Column({ type: 'enum', enum: ApprovalStatus, default: ApprovalStatus.PENDING })
  joinStatus!: ApprovalStatus;

  @OneToOne(() => Resident, (resident) => resident.user, { nullable: true })
  @JoinColumn({ name: 'residentId' })
  resident?: Resident;

  @Column({ nullable: true })
  residentId?: string;

  @ManyToOne(() => Apartment, (apartment) => apartment.users, { nullable: true })
  @JoinColumn({ name: 'apartmentId' })
  apartment?: Apartment;

  @Column({ nullable: true })
  apartmentId?: string;

  @OneToMany(() => Complaint, (complaint) => complaint.user)
  complaints!: Complaint[];

  /* @OneToMany(() => Notice, (notice) => notice.user)
  notices!: Notice[]; */

  @OneToMany(() => Poll, (poll) => poll.user)
  polls!: Poll[];

  @OneToMany(() => Vote, (vote) => vote.user)
  votes!: Vote[];

  @OneToMany(() => Comment, (comment) => comment.user)
  comments!: Comment[];

  @OneToMany(() => UserNotification, (userNotification) => userNotification.user)
  userNotifications!: UserNotification[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt?: Date;

  @Column({ nullable: true })
  lastLoginAt?: Date;

  @Column({ nullable: true })
  refreshToken?: string;
}
