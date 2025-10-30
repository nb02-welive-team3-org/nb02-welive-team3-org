import { z } from 'zod';
import { NoticeListItemSchema } from '../dto/notice-response.dto';
import { CommentResponseSchema } from './create-comment.response.dto';

//게시판 이름(카테고리와 별개로, UI에서 노출하는 보드명)
export const BoardNameEnum = z.enum(['NOTICE', 'COMPLAINT', 'VOTE']);

export const NoticeDetailSchema = NoticeListItemSchema.extend({
  // 상세 전용 필드
  content: z.string().min(1, '본문이 비어 있습니다.'),
  boardName: BoardNameEnum,
  comments: z.array(CommentResponseSchema).default([]),
});

export type BoardName = z.infer<typeof BoardNameEnum>;
export type NoticeDetailDto = z.infer<typeof NoticeDetailSchema>;
export type NoticeDetailResponseDto = z.infer<typeof NoticeDetailSchema>;
export type NoticeDetail = z.infer<typeof NoticeDetailSchema>;
