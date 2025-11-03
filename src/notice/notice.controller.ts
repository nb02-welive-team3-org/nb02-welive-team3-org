import { Request, Response } from 'express';
import { CreateNoticeRequestSchema } from './dto/create-notice.dto'
import { NoticeListquerySchema } from './dto/list-notice.query.dto'
import * as noticeService from './notice.service'
import { UpdateRequestSchema } from './dto/update-notice.request.dto'
import { DeleteNoticeRequestDto } from './dto/delete-notice.dto'
import { createNotification } from './../notofications/notifications.service'
import { NotificationType } from '../entities/notification.entity';
import { residentListDetail } from '../residents/resident.service';

export const CreateNotice = async (req: Request, res: Response) => {
    const Result = CreateNoticeRequestSchema.parse({
        userId: (req as any).user?.id,
        ...req.body
    });
    await noticeService.createNotice(Result);

    const residents = await residentListDetail(residentId, apartmentId);
    const userIds = residents.map(resident => resident.userId);

    console.log('입주민 수:', userIds.length); // 몇 명에게 알림을 보내는지 로그 기록

    if (userIds.length > 0) {
        await createNotification(
            userIds,
            `새로운 공지사항이 등록되었습니다.`,
            NotificationType.SIGNUP_REQ
        );
    }

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

