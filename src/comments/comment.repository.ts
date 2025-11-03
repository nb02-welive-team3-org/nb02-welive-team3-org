import { AppDataSource } from "../config/data-source";
import { Comment } from "../entities/comment.entity";
import { User } from "../entities/user.entity";
import { Complaint } from "../entities/complaint.entity";
import { Notice } from "../entities/notice.entity";
import { NotFoundError } from "../types/error.type";
import { BoardType } from "./comment.schema";

const commentRepo = AppDataSource.getRepository(Comment);
const userRepo = AppDataSource.getRepository(User);
const complaintRepo = AppDataSource.getRepository(Complaint);
const noticeRepo = AppDataSource.getRepository(Notice);

export const createComment = async (data: {
  userId: string;
  content: string;
  boardId: string;
  boardType: BoardType;
}) => {
  const user = await userRepo.findOneBy({ id: data.userId });
  if (!user) throw new NotFoundError("유저를 찾을 수 없습니다.");

  if (data.boardType === "COMPLAINT") {
    const complaint = await complaintRepo.findOneBy({
      complaintId: data.boardId,
    });
    if (!complaint) throw new NotFoundError("민원을 찾을 수 없습니다.");

    const comment = commentRepo.create({
      content: data.content,
      userId: data.userId,
      writerName: user.name,
      complaintId: data.boardId,
    });

    const saved = await commentRepo.save(comment);

    return {
      id: saved.id,
      userId: saved.userId,
      content: saved.content,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      writerName: saved.writerName,
      boardId: saved.complaintId!,
      boardType: "COMPLAINT" as BoardType,
    };
  } else {
    const notice = await noticeRepo.findOneBy({
      id: data.boardId,
    });
    if (!notice) throw new NotFoundError("공지사항을 찾을 수 없습니다.");

    const comment = commentRepo.create({
      content: data.content,
      userId: data.userId,
      writerName: user.name,
      noticeId: data.boardId,
    });

    const saved = await commentRepo.save(comment);

    return {
      id: saved.id,
      userId: saved.userId,
      content: saved.content,
      createdAt: saved.createdAt,
      updatedAt: saved.updatedAt,
      writerName: saved.writerName,
      boardId: saved.noticeId!,
      boardType: "NOTICE" as BoardType,
    };
  }
};

export const findById = async (id: string) => {
  return await commentRepo.findOneBy({ id });
};
 
export const getCommentsByBoard = async (data: {
  boardId: string;
  boardType: BoardType;
}) => {
  if (data.boardType === "COMPLAINT") {
    const complaint = await complaintRepo.findOneBy({
      complaintId: data.boardId,
    });
    if (!complaint) throw new NotFoundError("민원을 찾을 수 없습니다.");

    const comments = await commentRepo.find({
      where: { complaintId: data.boardId },
      order: { createdAt: "ASC" },
    });

    return comments.map((comment) => ({
      id: comment.id,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      writerName: comment.writerName,
    }));
  } else {
    const notice = await noticeRepo.findOneBy({
      id: data.boardId,
    });
    if (!notice) throw new NotFoundError("공지사항을 찾을 수 없습니다.");

    const comments = await commentRepo.find({
      where: { noticeId: data.boardId },
      order: { createdAt: "ASC" },
    });

    return comments.map((comment) => ({
      id: comment.id,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      writerName: comment.writerName,
    }));
  }
};

export const updateComment = async ({
  id,
  content,
}: {
  id: string;
  content: string;
}) => {
  await commentRepo.update({ id }, { content });

  const updated = await commentRepo.findOneBy({ id });
  if (!updated) throw new NotFoundError("댓글을 찾을 수 없습니다.");

  const boardType: BoardType = updated.complaintId ? "COMPLAINT" : "NOTICE";
  const boardId = updated.complaintId || updated.noticeId!;

  return {
    id: updated.id,
    userId: updated.userId,
    content: updated.content,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    writerName: updated.writerName,
    boardId,
    boardType,
  };
};

export const deleteComment = async (id: string) => {
  const comment = await commentRepo.findOneBy({ id });
  if (!comment) throw new NotFoundError("삭제할 댓글을 찾을 수 없습니다.");

  const result = await commentRepo.delete({ id });
  if (result.affected === 0) {
    throw new NotFoundError("삭제할 댓글을 찾을 수 없습니다.");
  }
};