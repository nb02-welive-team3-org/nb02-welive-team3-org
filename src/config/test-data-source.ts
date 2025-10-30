import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from '../entities/user.entity';
import { Apartment } from '../entities/apartment.entity';
import { Resident } from '../entities/resident.entity';
import { NoticeBoard } from '../entities/notice-board.entity';
import { ComplaintBoard } from '../entities/complaint-board.entity';
import { Complaint } from '../entities/complaint.entity';
import { Notice } from '../entities/notice.entity';
import { PollBoard } from '../entities/poll-board.entity';
import { Vote } from '../entities/vote.entity';
import { Poll } from '../entities/poll.entity';
import { PollOption } from '../entities/poll-option.entity';
import { Notification } from '../entities/notification.entity';
import { UserNotification } from '../entities/user-notification.entity';
import { Comment } from '../entities/comment.entity';

dotenv.config();

export const TestAppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.TEST_DB_HOST,
  port: parseInt(process.env.TEST_DB_PORT || '15433'),
  username: process.env.TEST_DB_USERNAME,
  password: process.env.TEST_DB_PASSWORD,
  database: process.env.TEST_DB_NAME,
  synchronize: true,
  logging: false,
  dropSchema: true,
  entities: [
    User,
    Apartment,
    Resident,
    NoticeBoard,
    ComplaintBoard,
    Complaint,
    Notice,
    PollBoard,
    Vote,
    Poll,
    PollOption,
    Notification,
    UserNotification,
    Comment,
  ],
});
