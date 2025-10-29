import express from 'express';
import { allow, AllowedRole } from '../../middlewares/allow.middleware';
import {
  createComplaintComment,
  updateComplaintComment,
  deleteComplaintComment,
} from './comment.controller';

const comment = express.Router();

/**
 * 댓글 등록
 * POST /api/comments
 */
comment.post('/', allow(AllowedRole.USER), createComplaintComment);

/**
 * 댓글 수정
 * PATCH /api/comments/:commentId
 */
comment.patch('/:commentId', allow(AllowedRole.USER), updateComplaintComment);

/**
 * 댓글 삭제
 * DELETE /api/comments/:commentId
 */
comment.delete('/:commentId', allow(AllowedRole.USER), deleteComplaintComment);

export default comment;
