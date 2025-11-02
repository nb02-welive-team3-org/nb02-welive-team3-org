import { z } from 'zod';

export const NoticeCategoryEnum = z.enum([
  "MAINTENANCE",
  "EMERGENCY",
  "COMMUNITY",
  "RESIDENT_VOTE",
  "RESIDENT_COUNCIL",
  "ETC",
]);

const trim = (v: unknown) => (typeof v === "string" ? v.trim() : v);
const TITLE_ALLOWED = /^[\p{L}\p{N}\s.,!?()'"\/:-]{1,20}$/u;

/** 내용: 1~200자, 개행/이모지 허용, HTML 불가(<, > 금지) */
const FORBID_HTML = /[<>]/;

/** 요청 바디 스키마 */
export const CreateNoticeRequestSchema = z
  .object({
    userId: z.string().uuid(),
    category: NoticeCategoryEnum,
    title: z.preprocess(
      trim,
      z
        .string()
        .min(1, "제목은 1~20자여야 합니다.")
        .max(20, "제목은 1~20자여야 합니다.")
        .refine((v) => TITLE_ALLOWED.test(v), "허용되지 않은 문자가 포함되어 있습니다."),
    ),
    content: z
      .string()
      .min(1, "내용은 1~200자여야 합니다.")
      .max(200, "내용은 1~200자여야 합니다.")
      .refine((v) => !FORBID_HTML.test(v), "HTML 태그(<, >)는 허용되지 않습니다."),
    boardId: z.string().uuid("boardId는 UUID 형식이어야 합니다.").nullable().optional(),
    isPinned: z.boolean().optional().default(false),
    startDate: z.string().datetime().optional(), // ISO8601(UTC)
    endDate: z.string().datetime().optional(),   // ISO8601(UTC)
  })

export type CreateNoticeRequestDto = z.infer<typeof CreateNoticeRequestSchema>;

/** 성공 응답 스키마(메시지형) */
export const CreateNoticeResponseSchema = z.object({
  message: z.literal("정상적으로 등록 처리되었습니다."),
  // 추후 필요 시: id: z.string().uuid()
});
export type CreateNoticeResponseDto = z.infer<typeof CreateNoticeResponseSchema>;

