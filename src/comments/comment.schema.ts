// comment.schema.ts
import { z } from "zod";

export const BoardTypeEnum = z.enum(["COMPLAINT", "NOTICE"]);

export const createCommentSchema = z.object({
  content: z
    .string()
    .min(1, { message: "댓글 내용은 필수입니다." })
    .max(500, { message: "댓글은 500자 이내여야 합니다." }),
  boardId: z
    .string()
    .uuid({ message: "boardId는 UUID 형식이어야 합니다." }),
  boardType: BoardTypeEnum,
});

export const updateCommentSchema = z.object({
  content: z
    .string()
    .min(1, { message: "댓글 내용은 필수입니다." })
    .max(500, { message: "댓글은 500자 이내여야 합니다." }),
});

export const getCommentsQuerySchema = z.object({
  boardId: z.string().uuid({ message: "boardId는 UUID 형식이어야 합니다." }),
  boardType: BoardTypeEnum,
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type GetCommentsQuery = z.infer<typeof getCommentsQuerySchema>;
export type BoardType = z.infer<typeof BoardTypeEnum>;