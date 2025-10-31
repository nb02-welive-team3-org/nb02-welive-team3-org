import { Request } from 'express';
import { Payload } from '../types/payload.type';
import { UnauthorizedError } from '../types/error.type';
import { UserRole } from '../entities/user.entity';

export const getUser = (req: Request): Payload => {
  const user = req.user;
  if (user !== undefined) {
    return user;
  }
  throw new UnauthorizedError();
};
export const setUser = (req: Request, user: Payload): Payload => (req.user = user);
export const isUser = (user: Payload): boolean => user.role === UserRole.USER;
export const isUserAdmin = (user: Payload): boolean => user.role === UserRole.ADMIN;
export const isUserSuperAdmin = (user: Payload): boolean => user.role === UserRole.SUPER_ADMIN;
