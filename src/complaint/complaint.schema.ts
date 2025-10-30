import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { ComplaintStatus } from "../entities/complaint.entity";

export const createComplaintSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다."),
  content: z.string().min(1, "내용은 필수입니다."),
  isPublic: z.boolean().default(true),
  boardId: z.string().uuid().default(() => uuidv4()),
  status: z.nativeEnum(ComplaintStatus).default(ComplaintStatus.PENDING),
});

export const updateComplaintSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
  isPublic: z.boolean().optional(),
});

export const updateComplaintStatusSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
});

// 타입 추출
export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintInput = z.infer<typeof updateComplaintSchema>;
export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;
