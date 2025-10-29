import { z } from 'zod';
import { UserRole } from '../entities/user.entity';
import { ApprovalStatus } from '../entities/approvalStatus.entity';

// =============================
// : ZOD CUSTOM TYPES
// =============================
const id = z.uuid();
const email = z.email();
const username = z.string().min(3).max(128);
const password = z
  .string()
  .min(8)
  .max(128)
  .regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>-_]).{8,128}$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.',
  });
const name = z.string().min(1).max(64);
const contact = z.string().max(11);
const role = z.enum(UserRole);
const joinStatus = z.enum(ApprovalStatus);
const apartmentName = z.string().min(1).max(64);
const apartmentDong = z.string().min(1).max(8);
const apartmentHo = z.string().min(1).max(8);
const isActive = z.boolean();
const description = z.string().min(1).max(256);
const avatar = z.url().nullable();
const startComplexNumber = z.string().min(1).max(8);
const endComplexNumber = z.string().min(1).max(8);
const startDongNumber = z.string().min(1).max(8);
const endDongNumber = z.string().min(1).max(8);
const startFloorNumber = z.string().min(1).max(8);
const endFloorNumber = z.string().min(1).max(8);
const startHoNumber = z.string().min(1).max(8);
const endHoNumber = z.string().min(1).max(8);
const apartmentAddress = z.string().min(1).max(512);
const apartmentManagementNumber = z.string().min(1).max(11);
const apartmentId = z.uuid().nullable();
const residentDong = z.string().min(1).max(8).nullable();
const boardIds = z.object({
  COMPLAINT: z.uuid(),
  NOTICE: z.uuid(),
  POLL: z.uuid(),
});
const message = z.string().min(1).max(128);
const user = z.object({ id: id, role: role });

// =============================
// : ZOD SCHEMAS
// =============================

export const AuthRequestParamsSchema = z.object({
  id: id,
});

export const SignupRequestBodySchema = z.object({
  username: username,
  password: password,
  //passwordConfirm: password,
  contact: contact,
  name: name,
  email: email,
  role: role.default(UserRole.USER),
  apartmentName: apartmentName,
  apartmentDong: apartmentDong,
  apartmentHo: apartmentHo,
});

export const SignupRequestSchema = z.object({
  body: SignupRequestBodySchema,
});

export const SignupResponseSchema = z.object({
  id: id,
  name: name,
  email: email,
  role: role,
  joinStatus: joinStatus,
  isActive: isActive,
});

export const SignupAdminRequestBodySchema = z.object({
  username: username,
  password: password,
  //passwordConfirm: password,
  contact: contact,
  name: name,
  email: email,
  role: role.default(UserRole.ADMIN),
  description: description,
  startComplexNumber: startComplexNumber,
  endComplexNumber: endComplexNumber,
  startDongNumber: startDongNumber,
  endDongNumber: endDongNumber,
  startFloorNumber: startFloorNumber,
  endFloorNumber: endFloorNumber,
  startHoNumber: startHoNumber,
  endHoNumber: endHoNumber,
  apartmentName: apartmentName,
  apartmentAddress: apartmentAddress,
  apartmentManagementNumber: apartmentManagementNumber,
});

export const SignupAdminRequestSchema = z.object({
  body: SignupAdminRequestBodySchema,
});

export const SignupAdminResponseSchema = z.object({
  id: id,
  name: name,
  email: email,
  role: role,
  joinStatus: joinStatus,
  isActive: isActive,
});

export const SignupSuperAdminRequestBodySchema = z.object({
  username: username,
  password: password,
  contact: contact,
  name: name,
  email: email,
  role: role.default(UserRole.SUPER_ADMIN),
  joinStatus: joinStatus.default(ApprovalStatus.APPROVED),
});

export const SignupSuperAdminRequestSchema = z.object({
  body: SignupSuperAdminRequestBodySchema,
});

export const SignupSuperAdminResponseSchema = z.object({
  id: id,
  name: name,
  email: email,
  role: role,
  joinStatus: joinStatus,
  isActive: isActive,
});

export const LoginRequestBodySchema = z.object({
  username: username,
  password: password,
});

export const LoginRequestSchema = z.object({
  body: LoginRequestBodySchema,
});

export const LoginResponseSchema = z.object({
  id: id,
  name: name,
  email: email,
  role: role,
  joinStatus: joinStatus,
  isActive: isActive,
  apartmentId: apartmentId,
  apartmentName: apartmentName,
  residentDong: residentDong,
  boardIds: boardIds,
  username: username,
  contact: contact,
  avatar: avatar,
});

export const LogoutRequestSchema = z.object({
  user: user,
});

export const LogoutResponseSchema = z.object({});

export const RefreshRequestSchema = z.object({
  user: user,
});

export const RefreshResponseSchema = z.object({
  message: message,
});

export const UpdateAdminStatusRequestParamsSchema = z.object({
  id: id,
});

export const UpdateAdminStatusRequestBodySchema = z.object({
  status: joinStatus,
});

export const UpdateAdminStatusRequestSchema = z.object({
  params: UpdateAdminStatusRequestParamsSchema,
  body: UpdateAdminStatusRequestBodySchema,
});

export const UpdateAdminStatusResponseSchema = z.object({
  message: message,
});

export const UpdateAdminsStatusRequestBodySchema = z.object({
  status: joinStatus,
});

export const UpdateAdminsStatusRequestSchema = z.object({
  body: UpdateAdminsStatusRequestBodySchema,
});

export const UpdateAdminsStatusResponseSchema = z.object({
  message: message,
});

export const UpdateResidentStatusRequestBodySchema = z.object({
  status: joinStatus,
});

export const UpdateResidentStatusRequestSchema = z.object({
  params: UpdateAdminStatusRequestParamsSchema,
  body: UpdateResidentStatusRequestBodySchema,
});

export const UpdateResidentStatusResponseSchema = z.object({
  message: message,
});

export const UpdateResidentsStatusRequestBodySchema = z.object({
  status: joinStatus,
});

export const UpdateResidentsStatusRequestSchema = z.object({
  body: UpdateResidentsStatusRequestBodySchema,
});

export const UpdateResidentsStatusResponseSchema = z.object({
  message: z.string().min(1).max(128),
});

export const UpdateAdminRequestBodySchema = z.object({
  contact: contact.optional(),
  email: email.optional(),
  description: description.optional(),
  apartmentName: apartmentName.optional(),
  apartmentAddress: apartmentAddress.optional(),
  apartmentManagementNumber: apartmentManagementNumber.optional(),
});

export const UpdateAdminRequestSchema = z.object({
  body: UpdateAdminRequestBodySchema,
  params: AuthRequestParamsSchema,
});

export const UpdateAdminResponseSchema = z.object({
  message: message,
});

export const DeleteAdminRequestSchema = z.object({
  params: AuthRequestParamsSchema,
});

export const DeleteAdminResponseSchema = z.object({
  message: message,
});

export const CleanupRequestSchema = z.object({});

export const CleanupResponseSchema = z.object({
  message: message,
});
