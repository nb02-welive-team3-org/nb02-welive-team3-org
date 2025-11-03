import { z } from "zod";
import { ComplaintStatus } from "../entities/complaint.entity";

export const createComplaintSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다."),
  content: z.string().min(1, "내용은 필수입니다."),
  isPublic: z.boolean().default(true),
  boardId: z.string().nullable().optional(),
  ho: z.string().optional(),

  status: z.nativeEnum(ComplaintStatus).default(ComplaintStatus.PENDING),
});

export const updateComplaintSchema = z.object({
  title: z.string().optional(),
  content: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export const updateComplaintStatusSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
});

export type CreateComplaintInput = z.infer<typeof createComplaintSchema>;
export type UpdateComplaintInput = z.infer<typeof updateComplaintSchema>;
export type UpdateComplaintStatusInput = z.infer<typeof updateComplaintStatusSchema>;
