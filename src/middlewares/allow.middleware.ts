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

    // 2025.10.31
    // 토큰이 없는 경우 예외처리
    // 역할이 NONE인 경우만 통과합니다.
    if (accessToken === undefined) {
      if (role === 'NONE') {
        return next();
      }
      throw new UnauthorizedError();
    }

    const payload = verifyAccessToken(accessToken);

    setUser(req, payload);

    // 2025.10.31
    // 역할에 따른 접근 제어 로직 개선
    // 순서 변경 및 역할 체크 방식 수정
    if (isUserSuperAdmin(payload)) return next();

    if (role === 'ADMIN' && isUserAdmin(payload)) return next();

    if (role === 'USER' && (isUser(payload) || isUserAdmin(payload))) return next();

    if (role === 'NONE' && (isUser(payload) || isUserAdmin(payload) || isUserSuperAdmin(payload))) return next();

    throw new ForbiddenError();
  };
};
