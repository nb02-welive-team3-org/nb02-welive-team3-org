import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { notFoundHandler } from './handler/not-found.handler';
import root from './root/root.router';
import { globalErrorHandler } from './handler/global-error.handler';
import auth from './auth/auth.router';
import resident from './residents/resident.router';
import apartments from './apartments/apartments.router';
import env from './config/env';
import notifications from './notofications/notifications.router';
import pollsRouter from './polls/polls.router';
import users from './users/users.router';
import complaint from './complaint/complaint.router';
import vote from './votes/votes.router';
import notice from './notice/notice.router';
import pollSchedulerRouter from './poll-scheduler/poll-scheduler.router';
import comment from './comments/comment.router';
import { setupSwagger } from './swagger/swaggerSetup';

const app: Application = express();

// 미들웨어
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
setupSwagger(app);

app.use('/api', root);
app.use('/api/auth', auth);
app.use('/api/residents', resident);
app.use('/api/apartments', apartments);
app.use('/api/complaints', complaint);
app.use('/api/notifications', notifications);
app.use('/api/users', users);
app.use('/api/polls', pollsRouter);
app.use('/api/options', vote);
app.use('/api/notices', notice);
app.use('/api/poll-scheduler', pollSchedulerRouter);
app.use('/api/comments', comment);

app.use(notFoundHandler);
app.use(globalErrorHandler);

export default app;
