import { Request, Response } from "express";
import * as complaintCommentService from "./comment.service";
import {
  createCommentSchema,
  updateCommentSchema,
} from "./comment.schema";
import { CommentWithBoardResponseDto } from "./comment.dto";

/**
 * POST /api/comments
 */
export const createComplaintComment = async (req: Request, res: Response) => {
  const parsed = createCommentSchema.parse(req.body);
  const userId = req.user!.id;

  const comment = await complaintCommentService.createComplaintComment({
    userId,
    content: parsed.content,
    complaintId: parsed.boardId,
  });

  const response: CommentWithBoardResponseDto = {
    comment: {
      id: comment.commentId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      writerName: comment.writerName,
    },
    board: {
      id: comment.complaintId,
      boardType: parsed.boardType,
    },
  };

  return res.status(201).json(response);
};

/**
 * PATCH /api/comments/:commentId
 */
export const updateComplaintComment = async (req: Request, res: Response) => {
  const parsed = updateCommentSchema.parse(req.body);
  const { commentId } = req.params;
  const userId = req.user!.id;

  const comment = await complaintCommentService.updateComplaintComment({
    commentId,
    userId,
    content: parsed.content,
  });

  const response: CommentWithBoardResponseDto = {
    comment: {
      id: comment.commentId,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      writerName: comment.writerName,
    },
    board: {
      id: comment.complaintId,
      boardType: "COMPLAINT",
    },
  };

  return res.status(200).json(response);
};

/**
 * DELETE /api/comments/:commentId
 */
export const deleteComplaintComment = async (req: Request, res: Response) => {
  const { commentId } = req.params;
  const userId = req.user!.id;

  await complaintCommentService.deleteComplaintComment(commentId, userId);

  return res.status(200).json({ message: "정상적으로 삭제 처리되었습니다" });
};