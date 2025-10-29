import * as complaintCommentRepository from "./comment.repository";
import { ForbiddenError, NotFoundError } from "../../types/error.type";

interface CreateComplaintCommentInput {
  userId: string;
  content: string;
  complaintId: string;
}

interface UpdateComplaintCommentInput {
  commentId: string;
  userId: string;
  content: string;
}

// 댓글 생성
export const createComplaintComment = async (data: CreateComplaintCommentInput) => {
  return await complaintCommentRepository.createComplaintComment(data);
};

// 댓글 수정
export const updateComplaintComment = async (data: UpdateComplaintCommentInput) => {
  const existing = await complaintCommentRepository.findById(data.commentId);
  if (!existing) throw new NotFoundError("존재하지 않는 댓글입니다.");
  if (existing.userId !== data.userId)
    throw new ForbiddenError("본인 댓글만 수정할 수 있습니다.");

  return await complaintCommentRepository.updateComplaintComment(data);
};

// 댓글 삭제
export const deleteComplaintComment = async (commentId: string, userId: string) => {
  const existing = await complaintCommentRepository.findById(commentId);
  if (!existing) throw new NotFoundError("존재하지 않는 댓글입니다.");
  if (existing.userId !== userId)
    throw new ForbiddenError("본인 댓글만 삭제할 수 있습니다.");

  await complaintCommentRepository.deleteComplaintComment(commentId);
};

