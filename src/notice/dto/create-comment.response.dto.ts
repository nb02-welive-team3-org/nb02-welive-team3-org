//comment.response.dto.ts 임시 코드 
import { z } from "zod";

export enum BoardType {
    COMPLAINT = 'COMPLAINT',
    NOTICE = 'NOTICE',
    POLL = 'POLL'
}

export const CommentResponseSchema = z.object({
    id: z.string().uuid(),
    userId: z.string().uuid(),
    writerName: z.string(),
    content: z.string(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
    boardId: z.string().optional(),
    boardType: z.enum(BoardType).optional(),
});

export type CommentResponseDto = z.infer<typeof CommentResponseSchema>;
