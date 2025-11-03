import { Request, Response } from "express";
import * as commentService from "./comment.service";
import {
  createCommentSchema,
  updateCommentSchema,
} from "./comment.schema";
import { CommentWithBoardResponseDto } from "./comment.dto";

/**
 * POST /api/comments
 */
export const createComment = async (req: Request, res: Response) => {
  const parsed = createCommentSchema.parse(req.body);
  const userId = req.user!.id;

  const comment = await commentService.createComment({
    userId,
    content: parsed.content,
    boardId: parsed.boardId,
    boardType: parsed.boardType,
  });

  const response: CommentWithBoardResponseDto = {
    comment: {
      id: comment.id,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      writerName: comment.writerName,
    },
    board: {
      id: parsed.boardId,
      boardType: parsed.boardType,
    },
  };

  return res.status(201).json(response);
};

/**
 * PATCH /api/comments/:commentId
 */
export const updateComment = async (req: Request, res: Response) => {
  const parsed = updateCommentSchema.parse(req.body);
  const { id } = req.params;
  const userId = req.user!.id;

  const comment = await commentService.updateComment({
    id,
    userId,
    content: parsed.content,
  });

  const response: CommentWithBoardResponseDto = {
    comment: {
      id: comment.id,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt.toISOString(),
      updatedAt: comment.updatedAt.toISOString(),
      writerName: comment.writerName,
    },
    board: {
      id: comment.boardId,
      boardType: comment.boardType,
    },
  };

  return res.status(200).json(response);
};

/**
 * DELETE /api/comments/:commentId
 */
export const deleteComment = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.id;
  const userRole = req.user!.role;

  await commentService.deleteComment({
    id,
    userId,
    userRole,
  });

  return res.status(200).json({ message: "정상적으로 삭제 처리되었습니다" });
};