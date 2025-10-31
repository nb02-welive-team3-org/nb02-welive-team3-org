import { RequestHandler } from 'express';
import {
  DeleteAdminRequestSchema,
  LoginRequestSchema,
  LoginResponseSchema,
  LogoutRequestSchema,
  RefreshRequestSchema,
  RefreshResponseSchema,
  SignupAdminRequestSchema,
  SignupAdminResponseSchema,
  SignupRequestSchema,
  SignupResponseSchema,
  SignupSuperAdminRequestSchema,
  SignupSuperAdminResponseSchema,
  UpdateAdminRequestSchema,
  UpdateAdminsStatusRequestSchema,
  UpdateAdminStatusRequestSchema,
  UpdateResidentsStatusRequestSchema,
} from './auth.dto';
import { BadRequestError, UnauthorizedError } from '../types/error.type';
import {
  addRefreshToken,
  cleanup,
  deleteAdmin,
  login,
  logout,
  refresh,
  removeRefreshToken,
  signup,
  signupAdmin,
  signupSuperAdmin,
  updateAdmin,
  updateAdminsStatus,
  updateAdminStatus,
  updateResidentsStatus,
  updateResidentStatus,
} from './auth.service';
import z from 'zod';
import {
  deleteAccessToken,
  deleteRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from '../utils/token.util';
import { Payload } from '../types/payload.type';
import { getUser } from '../utils/user.util';
import { createNotification } from '../notofications/notifications.service';
import { NotificationType } from '../entities/notification.entity';
import { getApartment } from '../apartments/apartments.service';
import { getSuperAdmin } from '../users/users.service';

export const handleSignup: RequestHandler = async (req, res) => {
  const result = SignupRequestSchema.safeParse({ body: req.body });
  if (!result.success) {
    throw new BadRequestError(`잘못된 요청(필수사항 누락 또는 잘못된 입력값)입니다. ${result.error.message}`);
  }

  const signedupUser = await signup(result.data.body);

  const response: z.infer<typeof SignupResponseSchema> = {
    id: signedupUser.id,
    name: signedupUser.name,
    email: signedupUser.email,
    role: signedupUser.role,
    joinStatus: signedupUser.joinStatus,
    isActive: signedupUser.isActive,
  };

  if (signedupUser.apartmentId) {
    const apartment = await getApartment(signedupUser.apartmentId);
    const adminId = apartment?.adminId;

    if (adminId) {
      await createNotification(
        [adminId],
        `${signedupUser.name}님이 회원가입을 요청했습니다.`,
        NotificationType.SIGNUP_REQ
      );
    }
  }

  res.status(201).json(response);
};

export const handleSignupAdmin: RequestHandler = async (req, res) => {
  const body = SignupAdminRequestSchema.safeParse({ body: req.body });
  if (!body.success) {
    throw new BadRequestError(`잘못된 요청(필수사항 누락 또는 잘못된 입력값)입니다. ${body.error.message}`);
  }

  const signedupUser = await signupAdmin(body.data.body);

  const response: z.infer<typeof SignupAdminResponseSchema> = {
    id: signedupUser.id,
    name: signedupUser.name,
    email: signedupUser.email,
    role: signedupUser.role,
    joinStatus: signedupUser.joinStatus,
    isActive: signedupUser.isActive,
  };

  const superAdmin = await getSuperAdmin();
  if (superAdmin) {
    await createNotification(
      [superAdmin.id],
      `${signedupUser.name} 관리자 계정이 새로 생성되었습니다.`,
      NotificationType.SIGNUP_REQ
    );
  }

  res.status(201).json(response);
};

export const handleSignupSuperAdmin: RequestHandler = async (req, res) => {
  const result = SignupSuperAdminRequestSchema.safeParse({ body: req.body });
  if (!result.success) {
    throw new BadRequestError(`잘못된 요청(필수사항 누락 또는 잘못된 입력값)입니다. ${result.error.message}`);
  }

  const signedupUser = await signupSuperAdmin(result.data.body);

  const response: z.infer<typeof SignupSuperAdminResponseSchema> = {
    id: signedupUser.id,
    name: signedupUser.name,
    email: signedupUser.email,
    role: signedupUser.role,
    joinStatus: signedupUser.joinStatus,
    isActive: signedupUser.isActive,
  };

  res.status(201).json(response);
};

export const handleLogin: RequestHandler = async (req, res) => {
  const result = LoginRequestSchema.safeParse({ body: req.body });
  if (!result.success) {
    throw new BadRequestError(`잘못된 요청(필수사항 누락 또는 잘못된 입력값)입니다.`);
  }

  const loggedinUser = await login(result.data.body);

  const response: z.infer<typeof LoginResponseSchema> = {
    id: loggedinUser.id,
    name: loggedinUser.name,
    email: loggedinUser.email,
    role: loggedinUser.role,
    joinStatus: loggedinUser.joinStatus,
    isActive: loggedinUser.isActive,
    apartmentId: loggedinUser.apartmentId,
    apartmentName: loggedinUser.apartment?.name || null,
    residentDong: loggedinUser.resident?.building || null,
    boardIds: {
      COMPLAINT: loggedinUser.apartment?.complaintBoard?.id || null,
      NOTICE: loggedinUser.apartment?.noticeBoard?.id || null,
      POLL: loggedinUser.apartment?.pollBoard?.id || null,
    },
    username: loggedinUser.username,
    contact: loggedinUser.contact,
    avatar: loggedinUser.avatar || null,
  };

  const payload: Payload = { id: loggedinUser.id, role: loggedinUser.role };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await addRefreshToken(loggedinUser.id, refreshToken);

  setAccessToken(res, accessToken);
  setRefreshToken(res, refreshToken);

  res.status(200).json(response);
};

export const handleLogout: RequestHandler = async (req, res) => {
  const result = LogoutRequestSchema.safeParse({ user: req.user });
  if (!result.success) {
    return new UnauthorizedError('로그아웃 중 오류가 발생했습니다.');
  }
  const { id } = result.data.user;

  await logout(id);

  deleteAccessToken(res);
  deleteRefreshToken(res);

  await removeRefreshToken(id);

  res.status(204).json('');
};

export const handleRefresh: RequestHandler = async (req, res) => {
  const result = RefreshRequestSchema.safeParse(req);
  if (!result.success) {
    throw new BadRequestError('잘못된 요청(필수사항 누락 또는 잘못된 입력값)입니다.');
  }

  const { id } = result.data.user;
  const refreshToken = getRefreshToken(req);
  if (!refreshToken) {
    throw new UnauthorizedError('인증 실패(로그인 필요)');
  }

  await refresh(id, refreshToken);

  const payload: Payload = { id: result.data.user.id, role: result.data.user.role };
  const newAccessToken = generateAccessToken(payload);
  const newRefreshToken = generateRefreshToken(payload);

  setAccessToken(res, newAccessToken);
  setRefreshToken(res, newRefreshToken);

  await addRefreshToken(id, newRefreshToken);

  const response: z.infer<typeof RefreshResponseSchema> = { message: '토큰이 성공적으로 갱신되었습니다.' };

  res.status(200).json(response);
};

export const handleUpdateAdminStatus: RequestHandler = async (req, res) => {
  const result = UpdateAdminStatusRequestSchema.safeParse({
    params: req.params,
    body: req.body,
  });

  if (!result.success) {
    throw new BadRequestError('잘못된 요청(필수사항 누락 또는 잘못된 입력값)입니다');
  }

  const { id } = result.data.params;
  const { status } = result.data.body;

  await updateAdminStatus(id, status);

  res.status(200).send({ message: '작업이 성공적으로 완료되었습니다' });
};

export const handleUpdateAdminsStatus: RequestHandler = async (req, res) => {
  const result = UpdateAdminsStatusRequestSchema.safeParse({
    body: req.body,
  });

  if (!result.success) {
    throw new BadRequestError('잘못된 요청(필수사항 누락 또는 잘못된 입력값)입니다');
  }

  const { status } = result.data.body;

  await updateAdminsStatus(status);

  res.status(200).send({ message: '작업이 성공적으로 완료되었습니다' });
};

export const handleUpdateResidentStatus: RequestHandler = async (req, res) => {
  const result = UpdateAdminStatusRequestSchema.safeParse({
    params: req.params,
    body: req.body,
  });

  if (!result.success) {
    throw new BadRequestError('잘못된 요청(필수사항 누락 또는 잘못된 입력값)입니다');
  }

  const { id } = result.data.params;
  const { status } = result.data.body;

  await updateResidentStatus(id, status);

  res.status(200).send({ message: '작업이 성공적으로 완료되었습니다' });
};

export const handleUpdateResidentsStatus: RequestHandler = async (req, res) => {
  const result = UpdateResidentsStatusRequestSchema.safeParse({
    body: req.body,
  });

  if (!result.success) {
    throw new BadRequestError('잘못된 요청(필수사항 누락 또는 잘못된 입력값)입니다');
  }

  const { status } = result.data.body;

  await updateResidentsStatus(status);

  res.status(200).send({ message: '작업이 성공적으로 완료되었습니다' });
};

export const handleUpdateAdmin: RequestHandler = async (req, res) => {
  const result = UpdateAdminRequestSchema.safeParse({
    body: req.body,
    params: req.params,
  });

  if (!result.success) {
    throw new BadRequestError('잘못된 요청(필수사항 누락 또는 잘못된 입력값)입니다');
  }

  const { id } = result.data.params;
  const { contact, email, description, apartmentName, apartmentAddress, apartmentManagementNumber } = result.data.body;

  await updateAdmin(id, {
    contact,
    email,
    description,
    apartmentName,
    apartmentAddress,
    apartmentManagementNumber,
  });

  res.status(200).send({ message: '작업이 성공적으로 완료되었습니다' });
};

export const handleDeleteAdmin: RequestHandler = async (req, res) => {
  const result = DeleteAdminRequestSchema.safeParse({
    params: req.params,
  });

  if (!result.success) {
    throw new BadRequestError('잘못된 요청(필수사항 누락 또는 잘못된 입력값)입니다');
  }

  const { id } = result.data.params;

  await deleteAdmin(id);

  res.status(200).send({ message: '작업이 성공적으로 완료되었습니다' });
};

export const handleCleanup: RequestHandler = async (req, res) => {
  const user = getUser(req);

  await cleanup(user.id);

  res.status(200).send({ message: '작업이 성공적으로 완료되었습니다' });
};
