//공지사항 생성&수정 공통 dto 
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
