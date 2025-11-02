import { z } from 'zod';
import { NoticeCategoryEnum } from "./notice-request.dto"

export const UpdateRequestSchema = z.object({
    noticeId: z.string().uuid(),
    userId: z.string().uuid().optional(),
    category: NoticeCategoryEnum,
    title: z.string().trim().min(1, "제목은 1자 이상이어야 합니다."),
    content: z.string(),
    isPinned: z.boolean(),
    boardId: z.string().uuid().nullable().optional(),
    startDate: z.string().datetime().optional(), // ISO8601(UTC)
    endDate: z.string().datetime().optional(),   // ISO8601(UTC)
});

export type UpdateRequestDto = z.infer<typeof UpdateRequestSchema>;