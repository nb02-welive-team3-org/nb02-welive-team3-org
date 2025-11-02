import { CreateNoticeRequestDto } from './dto/create-notice.dto';
import { AppDataSource } from '../config/data-source';
import { Notice, NoticeCategory } from '../entities/notice.entity';
import { NoticeListResponseDto, NoticeListItemDto } from './dto/list-notice.query.dto';
import { NoticeListqueryDto } from './dto/list-notice.query.dto';
import { User } from '../entities/user.entity';
import { NoticeDetailResponseDto } from './dto/notifications-read.response.dto';
import { _date } from 'zod/v4/core';
import { UpdateRequestDto } from './dto/update-notice.request.dto';
import { UpdateResponseSchema } from './dto/update-notice.response.dto';
import { DeleteNoticeRequestDtoType, DeleteNoticeResponseDto } from './dto/delete-notice.dto';
import { CommentResponseDto } from './dto/create-comment.response.dto';
import { NoticeBoard } from '../entities/notice-board.entity';

// 공지사항 생성 서비스
export const createNotice = async (data: CreateNoticeRequestDto & { userId: string }) => {
  const noticeRepo = AppDataSource.getRepository(Notice);
  const noticeBoardRepo = AppDataSource.getRepository(NoticeBoard);
  const userRepo = AppDataSource.getRepository(User);

  // 사용자 정보 가져오기 (user → apartmentId 확인)
  const user = await userRepo.findOne({
    where: { id: data.userId },
    relations: { apartment: true },
  });

  if (!user || !user.apartmentId) {
    throw new Error('유효하지 않은 사용자입니다. (apartmentId 누락)');
  }

  // 사용자 아파트에 해당하는 NoticeBoard 찾기
  let board = await noticeBoardRepo.findOne({
    where: { apartmentId: user.apartmentId },
  });

  if (!board) {
    throw new Error('해당 아파트의 NOTICE 게시판이 존재하지 않습니다.');
  }

  // 공지 생성
  const notice = noticeRepo.create({
    userId: data.userId,
    boardId: board.id,
    category: NoticeCategory[data.category as keyof typeof NoticeCategory],
    title: data.title,
    content: data.content,
    isPinned: data.isPinned ?? false,
    viewsCount: 0,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  });

  await noticeRepo.save(notice);
  return { message: '정상적으로 등록 처리되었습니다.' };
};

// Poll Scheduler용 공지사항 생성 함수 (userId 포함)
export const createNoticeWithUserId = async (data: CreateNoticeRequestDto & { userId: string }) => {
  const noticeRepo = AppDataSource.getRepository(Notice);
  const noticeBoardRepo = AppDataSource.getRepository(NoticeBoard);
  const userRepo = AppDataSource.getRepository(User);

  const user = await userRepo.findOne({
    where: { id: data.userId },
    relations: { apartment: true },
  });

  if (!user || !user.apartmentId) throw new Error('유효하지 않은 사용자입니다.');

  const board = await noticeBoardRepo.findOne({ where: { apartmentId: user.apartmentId } });
  if (!board) throw new Error('해당 아파트의 NOTICE 게시판이 존재하지 않습니다.');

  const notice = noticeRepo.create({
    userId: data.userId,
    boardId: board.id,
    category: NoticeCategory[data.category],
    title: data.title,
    content: data.content,
    isPinned: data.isPinned ?? false,
    viewsCount: 0,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  });

  await noticeRepo.save(notice);
};

export const ListNotice = async (
  query: NoticeListqueryDto
): Promise<NoticeListResponseDto> => {
  const noticeRepo = AppDataSource.getRepository(Notice);
  const userRepo = AppDataSource.getRepository(User);

  const qb = noticeRepo.createQueryBuilder('notice')
    .leftJoinAndSelect('notice.comments', 'comments')
    .skip((query.page - 1) * query.limit)
    .take(query.limit)
    .orderBy('notice.isPinned', 'DESC')
    .addOrderBy('notice.createdAt', 'DESC');

  if (query.boardId) {
    qb.andWhere('notice.boardId = :boardId', { boardId: query.boardId });
  }

  if (query.category) {
    qb.andWhere('notice.category = :category', { category: query.category });
  }

  if (query.search) {
    qb.andWhere('(notice.title ILIKE :search OR notice.content ILIKE :search)', {
      search: `%${query.search}%`,
    });
  }

  const [notices, totalCount] = await qb.getManyAndCount();

  const items: NoticeListItemDto[] = await Promise.all(
    notices.map(async notice => {
      const user = await userRepo.findOneBy({ id: notice.userId });
      return {
        noticeId: notice.id,
        userId: notice.userId,
        category: notice.category,
        title: notice.title,
        writerName: user?.name || '',
        isPinned: notice.isPinned,
        boardId: notice.boardId,
        viewsCount: notice.viewsCount,
        commentsCount: notice.comments.length,
        startDate: notice.startDate?.toISOString(),
        endDate: notice.endDate?.toISOString(),
        createdAt: notice.createdAt.toISOString(),
        updatedAt: notice.updatedAt.toISOString(),
      };
    })
  );

  return { notices: items, totalCount };
};


export const NoticeDetail = async (noticeId: string): Promise<NoticeDetailResponseDto> => {
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
    throw 'Not Found';
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
    writerName: targetUser ? targetUser.name : '',
    isPinned: value.isPinned,
    boardId: value.boardId,
    viewsCount: value.viewsCount,
    commentsCount: value.comments ? value.comments.length : 0,
    startDate: value.startDate ? value.startDate.toISOString() : undefined,
    endDate: value.endDate ? value.endDate.toISOString() : undefined,
    createdAt: value.createdAt.toISOString(),
    updatedAt: value.updatedAt.toISOString(),
    content: value.content,
    boardName: 'NOTICE',
    comments: comments,
  };
  return data;
};

export const UpdateNotice = async (data: UpdateRequestDto) => {
  const noticeRepo = AppDataSource.getRepository(Notice);

  const updateData: any = {
    category: NoticeCategory[data.category as keyof typeof NoticeCategory],
    title: data.title,
    content: data.content,
    isPinned: data.isPinned ?? false,
    startDate: data.startDate ? new Date(data.startDate) : undefined,
    endDate: data.endDate ? new Date(data.endDate) : undefined,
  };

  // boardId가 null이 아닌 경우만 넣기
  if (data.boardId) {
    updateData.boardId = data.boardId;
  }

  // 업데이트
  await noticeRepo.update({ id: data.noticeId }, updateData);

  // 변경 후 엔티티 조회
  const updated = await noticeRepo.findOneBy({ id: data.noticeId });

  // Zod로 검증 후 반환
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
      message: '공지사항이 정상적으로 삭제 되었습니다.',
    });
  } else {
    throw new Error('삭제할 공지사항이 존재하지 않습니다.');
  }
};
