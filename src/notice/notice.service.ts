import { ILike } from "typeorm";
import { CreateNoticeRequestDto } from "./dto/create-notice.dto";
import { AppDataSource } from "../config/data-source";
import { Notice, NoticeCategory } from "../entities/notice.entity";
import {
  NoticeListResponseDto,
  NoticeListItemDto,
} from "./dto/list-notice.query.dto";
import { NoticeListqueryDto } from "./dto/list-notice.query.dto";
import { User } from "../entities/user.entity";
import { NoticeDetailResponseDto } from "./dto/notifications-read.response.dto";
import { _date } from "zod/v4/core";
import { CommentResponseDto } from '../notice/notice-comments/create-comment.response.dto' // 파일 없어서 주석 처리
import { UpdateRequestDto } from "./dto/update-notice.request.dto";
import { UpdateResponseSchema } from "./dto/update-notice.response.dto";
import {
  DeleteNoticeRequestDtoType,
  DeleteNoticeResponseDto,
} from "./dto/delete-notice.dto";

//공지사항 생성 서비스
export const createNotice = async (data: CreateNoticeRequestDto) => {
  const noticeRepo = AppDataSource.getRepository(Notice);
  const target = noticeRepo.create({
    userId: data.userId,
    boardId: data.boardId,
    category: NoticeCategory[data.category],
    title: data.title,
    content: data.content,
    isPinned: data.isPinned,
    startDate: data.startDate,
    endDate: data.endDate,
  });

  await noticeRepo.save(target);
};

// Poll Scheduler용 공지사항 생성 함수 (userId 포함)
export const createNoticeWithUserId = async (
  data: CreateNoticeRequestDto & { userId: string }
) => {
  const noticeRepo = AppDataSource.getRepository(Notice);
  const target = noticeRepo.create({
    userId: data.userId,
    boardId: data.boardId,
    category: NoticeCategory[data.category],
    title: data.title,
    content: data.content,
    isPinned: data.isPinned,
    viewsCount: 0, // 초기값 0
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  });

  await noticeRepo.save(target);
};

export const ListNotice = async (
  query: NoticeListqueryDto
): Promise<NoticeListResponseDto> => {
  const noticeRepo = AppDataSource.getRepository(Notice);

  // ✅ totalCount 변수에 전체 개수 저장!
  const [notices, totalCount] = await noticeRepo.findAndCount({
    skip: (query.page - 1) * query.limit,
    take: query.limit,
    where: [
      {
        category: query.category ? NoticeCategory[query.category] : undefined,
        title: query.search ? ILike(`%${query.search}%`) : undefined,
      },
      {
        category: query.category ? NoticeCategory[query.category] : undefined,
        content: query.search ? ILike(`%${query.search}%`) : undefined,
      },
    ],
    relations: {
      comments: true,
    },
  });

  const userRepo = AppDataSource.getRepository(User);
  var data = await Promise.all(
    notices.map(async (value, _): Promise<NoticeListItemDto> => {
      var targetUser = await userRepo.findOneBy({ id: value.userId });
      return {
        noticeId: value.id,
        userId: value.userId,
        category: value.category,
        title: value.title,
        writerName: targetUser ? targetUser.name : "",
        isPinned: value.isPinned,
        boardId: value.boardId,
        viewsCount: value.viewsCount,
        commentsCount: value.comments.length,
        startDate: value.startDate ? value.startDate.toISOString() : undefined,
        endDate: value.endDate ? value.endDate.toISOString() : undefined,
        createdAt: value.createdAt.toISOString(),
        updatedAt: value.updatedAt.toISOString(),
      };
    })
  );

  const response: NoticeListResponseDto = {
    items: data,
    totalCount: totalCount, // ✅ data.length → totalCount로 변경!
  };
  return response;
};

export const NoticeDetail = async (
  noticeId: string
): Promise<NoticeDetailResponseDto> => {
  const noticeRepo = AppDataSource.getRepository(Notice);
  const value = await noticeRepo.findOne({
    where: {
      id: noticeId,
    },
    relations: {
      comments: true,
    },
  });
  if (!value) {
    throw "Not Found";
  }

  const userRepo = AppDataSource.getRepository(User);
  var targetUser = await userRepo.findOneBy({ id: value.userId });

  const comments = await Promise.all(
    value.comments.map(async (value, _): Promise<CommentResponseDto> => {
      await userRepo.findOneBy({
        id: value.userId,
      });
      return {
        id: value.commentId,
        userId: value.userId,
        writerName: value.writerName,
        content: value.content,
        createdAt: value.createdAt.toISOString(),
        updatedAt: value.updatedAt.toISOString(),
      };
    })
  );

  const data: NoticeDetailResponseDto = {
    noticeId: value.id,
    userId: value.userId,
    category: value.category,
    title: value.title,
    writerName: targetUser ? targetUser.name : "",
    isPinned: value.isPinned,
    boardId: value.boardId,
    viewsCount: value.viewsCount,
    commentsCount: value.comments ? value.comments.length : 0,
    startDate: value.startDate ? value.startDate.toISOString() : undefined,
    endDate: value.endDate ? value.endDate.toISOString() : undefined,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
    content: value.content,
    boardName: "NOTICE",
    comments: comments,
  };
  return data;
};

export const UpdateNotice = async (data: UpdateRequestDto) => {
  const noticeRepo = AppDataSource.getRepository(Notice);

  await noticeRepo.update(
    {
      id: data.noticeId,
      userId: data.userId,
    },
    {
      boardId: data.boardId,
      category: NoticeCategory[data.category as keyof typeof NoticeCategory],
      title: data.title,
      content: data.content,
      isPinned: data.isPinned,
      startDate: data.startDate,
      endDate: data.endDate,
    }
  );

  const updated = await noticeRepo.findOneBy({ id: data.noticeId });

  return UpdateResponseSchema.parse(updated);
};

export const DeleteNotice = async (data: DeleteNoticeRequestDtoType) => {
  const noticeRepo = AppDataSource.getRepository(Notice);

  const deleteResult = await noticeRepo.delete({
    id: data.noticeId,
  });

  if (deleteResult.affected && deleteResult.affected > 0) {
    // 삭제가 정상 처리되었으면 성공 메시지 반환
    console.log(Notice);
    return DeleteNoticeResponseDto.parse({
      message: "공지사항이 정상적으로 삭제 되었습니다.",
    });
  } else {
    throw new Error("삭제할 공지사항이 존재하지 않습니다.");
  }
};





