import { AppDataSource } from "../../config/data-source";
import { Comment } from "../../entities/complaint-comment.entity";
import { User } from "../../entities/user.entity";
import { Complaint } from "../../entities/complaint.entity";
import { NotFoundError } from "../../types/error.type";

const commentRepo = AppDataSource.getRepository(Comment);
const userRepo = AppDataSource.getRepository(User);
const complaintRepo = AppDataSource.getRepository(Complaint);

// 댓글 생성
export const createComplaintComment = async (data: {
  userId: string;
  content: string;
  complaintId: string;
}) => {
  const user = await userRepo.findOneBy({ id: data.userId });
  if (!user) throw new NotFoundError("유저를 찾을 수 없습니다.");

  const complaint = await complaintRepo.findOneBy({
    complaintId: data.complaintId,
  });
  if (!complaint) throw new NotFoundError("민원을 찾을 수 없습니다.");

  const comment = commentRepo.create({
    content: data.content,
    userId: data.userId,
    writerName: user.name,
    complaintId: data.complaintId,
  });

  const saved = await commentRepo.save(comment);
  await complaintRepo.increment(
    { complaintId: data.complaintId },
    "commentsCount",
    1
  );

  return {
    commentId: saved.commentId,
    userId: saved.userId,
    content: saved.content,
    createdAt: saved.createdAt,
    updatedAt: saved.updatedAt,
    writerName: saved.writerName,
    complaintId: saved.complaintId,
  };
};

// 댓글 조회 (수정/삭제용)
export const findById = async (commentId: string) => {
  return await commentRepo.findOneBy({ commentId });
};

// 댓글 수정
export const updateComplaintComment = async ({
  commentId,
  content,
}: {
  commentId: string;
  content: string;
}) => {
  await commentRepo.update({ commentId }, { content });

  const updated = await commentRepo.findOneBy({ commentId });
  if (!updated) throw new NotFoundError("댓글을 찾을 수 없습니다.");

  return {
    commentId: updated.commentId,
    userId: updated.userId,
    content: updated.content,
    createdAt: updated.createdAt,
    updatedAt: updated.updatedAt,
    writerName: updated.writerName,
    complaintId: updated.complaintId,
  };
};

// 댓글 삭제
export const deleteComplaintComment = async (commentId: string) => {
  const comment = await commentRepo.findOneBy({ commentId });
  if (!comment) throw new NotFoundError("삭제할 댓글을 찾을 수 없습니다.");

  const result = await commentRepo.delete({ commentId });
  if (result.affected === 0) {
    throw new NotFoundError("삭제할 댓글을 찾을 수 없습니다.");
  }

  await complaintRepo.decrement(
    { complaintId: comment.complaintId },
    "commentsCount",
    1
  );
};