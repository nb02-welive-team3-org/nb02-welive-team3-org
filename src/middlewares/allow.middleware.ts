import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../types/error.type';
import { isUser, isUserAdmin, isUserSuperAdmin, setUser } from '../utils/user.util';
import { getAccessToken, verifyAccessToken } from '../utils/token.util';

export enum AllowedRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  NONE = 'NONE',
}

export const allow = (role: AllowedRole) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const accessToken = getAccessToken(req);

    // NONE : signup,login
    if (accessToken === undefined) {
      if (role === 'NONE') {
        return next();
      }
      throw new UnauthorizedError();
    }

    const payload = verifyAccessToken(accessToken);

    setUser(req, payload);

    // USER
    if (role === 'USER' || isUser(payload) || isUserAdmin(payload) || isUserSuperAdmin(payload)) {
      return next();
    }

    // ADMIN
    if ((role === 'ADMIN' && isUserAdmin(payload)) || isUserSuperAdmin(payload)) {
      return next();
    }

    // SUPER_ADMIN
    if (role === 'SUPER_ADMIN' && isUserSuperAdmin(payload)) {
      return next();
    }

    throw new ForbiddenError();
  };
};
