import { z } from 'zod';

// =============================
// : ZOD CUSTOM TYPES
// =============================
const id = z.uuid();
const password = z
  .string()
  .min(8)
  .max(128)
  .regex(/^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>-_]).{8,128}$/, {
    message: '비밀번호는 영문, 숫자, 특수문자를 모두 포함해야 합니다.',
  });
const file = z.any();
const currentPassword = password;
const newPassword = password;

// =============================
// : ZOD SCHEMAS
// =============================

export const UserMeRequestBodySchema = z.object({
  currentPassword: currentPassword.optional(),
  newPassword: newPassword.optional(),
});

export const UserMeRequestSchema = z.object({
  body: UserMeRequestBodySchema.optional(),
});

export const UserAvartarRequestBodySchema = z.object({
  file: file,
});

export const UserAvartarRequestParamsSchema = z.object({
  id: id,
});

export const UserAvartarRequestSchema = z.object({
  body: UserAvartarRequestBodySchema,
  params: UserAvartarRequestParamsSchema,
});

export const UserPasswordRequestBodySchema = z.object({
  currentPassword: currentPassword,
  newPassword: newPassword,
});

export const UserPasswordRequestParamsSchema = z.object({
  id: id,
});

export const UserPasswordRequestSchema = z.object({
  body: UserPasswordRequestBodySchema,
  params: UserPasswordRequestParamsSchema,
});
