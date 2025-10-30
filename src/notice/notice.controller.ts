import { Request, Response } from 'express';
import { CreateNoticeRequestSchema } from './dto/create-notice.dto'
import { NoticeListquerySchema } from './dto/list-notice.query.dto'
import * as noticeService from './notice.service'
import { UpdateRequestSchema } from './dto/update-notice.request.dto'
import { DeleteNoticeRequestDto } from './dto/delete-notice.dto'

//공지사항 CRUD 
export const CreateNotice = async (req: Request, res: Response) => {
    const Result = CreateNoticeRequestSchema.parse({
        userId: (req as any).user?.id,
        ...req.body
    });
    await noticeService.createNotice(Result);
    return res.status(201).json({ message: '정상적으로 등록 처리되었습니다.' });
};

export const ListNotice = async (req: Request, res: Response) => {

    const Result = NoticeListquerySchema.parse(req.query)
    const notices = await noticeService.ListNotice(Result);
    return res.status(200).json(notices);
}

export const NoticeDetail = async (req: Request, res: Response) => {
    const notices = await noticeService.NoticeDetail(req.params.noticeId);
    return res.status(200).json(notices);
}

export const UpdateNotice = async (req: Request, res: Response) => {
    const noticeId = req.params.noticeId;
    const Result = UpdateRequestSchema.parse({
        noticeId: noticeId,
        ...req.body

    });

    await noticeService.UpdateNotice(Result);
    return res.status(200).json({ message: '정상적으로 수정 되었습니다.' });
};

export const DeleteNotice = async (req: Request, res: Response) => {
    const noticeId = req.params.noticeId;
    const Result = DeleteNoticeRequestDto.parse({
        noticeId: noticeId,
    });

    const response = await noticeService.DeleteNotice(Result);
    return res.status(200).json(response);
};

