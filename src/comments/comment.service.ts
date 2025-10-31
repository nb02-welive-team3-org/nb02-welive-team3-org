import * as commentRepository from "./comment.repository";
import { ForbiddenError, NotFoundError } from "../types/error.type";
import { BoardType } from "./comment.schema";

interface CreateCommentInput {
  userId: string;
  content: string;
  boardId: string;
  boardType: BoardType;
}

interface UpdateCommentInput {
  id: string;
  userId: string;
  content: string;
}

interface DeleteCommentInput {
  id: string;
  userId: string;
  userRole?: string;
}

interface GetCommentsInput {
  boardId: string;
  boardType: BoardType;
}

// 댓글 생성
export const createComment = async (data: CreateCommentInput) => {
  return await commentRepository.createComment(data);
};

// 댓글 조회
export const getComments = async (data: GetCommentsInput) => {
  return await commentRepository.getCommentsByBoard(data);
};

// 댓글 수정
export const updateComment = async (data: UpdateCommentInput) => {
  const existing = await commentRepository.findById(data.id);
  if (!existing) throw new NotFoundError("존재하지 않는 댓글입니다.");
  if (existing.userId !== data.userId)
    throw new ForbiddenError("본인 댓글만 수정할 수 있습니다.");

  return await commentRepository.updateComment({
    id: data.id,
    content: data.content,
  });
};

// 댓글 삭제
export const deleteComment = async (data: DeleteCommentInput) => {
  const existing = await commentRepository.findById(data.id);
  if (!existing) throw new NotFoundError("존재하지 않는 댓글입니다.");
  
  const isAdmin = data.userRole === "ADMIN" || data.userRole === "SUPER_ADMIN";
  if (!isAdmin && existing.userId !== data.userId) {
    throw new ForbiddenError("본인 댓글만 삭제할 수 있습니다.");
  }

  await commentRepository.deleteComment(data.id);
};