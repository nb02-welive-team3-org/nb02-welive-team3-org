import express from 'express';
import { allow, AllowedRole } from '../middlewares/allow.middleware';
import {
  createComment,
  updateComment,
  deleteComment,
} from './comment.controller';

const comment = express.Router();

/**
 * 댓글 등록
 * POST /api/comments
 */
comment.post('/', allow(AllowedRole.USER), createComment);

/**
 * 댓글 수정
 * PATCH /api/comments/:commentId
 */
comment.patch('/:id', allow(AllowedRole.USER), updateComment);

/**
 * 댓글 삭제
 * DELETE /api/comments/:commentId
 */
comment.delete('/:id', allow(AllowedRole.USER), deleteComment);

export default comment;