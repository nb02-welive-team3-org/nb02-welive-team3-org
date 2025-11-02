//공지사항 조회
// src/notice/dto/notice-response.dto.ts
import { z } from "zod";
import { NoticeCategoryEnum } from "./notice-request.dto"

export const NoticeListquerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).default(11),
    category: NoticeCategoryEnum.optional(),
    search: z.string().optional(),
    boardId: z.string().uuid().nullable().optional(),
})
export type NoticeListqueryDto = z.infer<typeof NoticeListquerySchema>;

export const NoticeListItemSchema = z.object({
    noticeId: z.string().uuid(),
    userId: z.string().uuid(),
    category: NoticeCategoryEnum,
    title: z.string(),
    writerName: z.string(),
    isPinned: z.boolean(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    boardId: z.string().uuid().nullable().optional(),

    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),

    viewsCount: z.number().int().min(0),
    commentsCount: z.number().int().min(0),
});
export type NoticeListItemDto = z.infer<typeof NoticeListItemSchema>;


//목록 응답(래퍼) — items + totalCount 
export const NoticeListResponseSchema = z.object({
    notices: z.array(NoticeListItemSchema),
    totalCount: z.number().int().nonnegative(),
});
export type NoticeListResponseDto = z.infer<typeof NoticeListResponseSchema>;

//상세 아이템 = 목록 아이템 + content 
export const NoticeDetailSchema = NoticeListItemSchema.extend({
    content: z.string(),
});
export type NoticeDetailDto = z.infer<typeof NoticeDetailSchema>;

//상세 응답(래퍼) 
export const NoticeDetailResponseSchema = z.object({
    item: NoticeDetailSchema,
});
export type NoticeDetailResponseDto = z.infer<typeof NoticeDetailResponseSchema>;
