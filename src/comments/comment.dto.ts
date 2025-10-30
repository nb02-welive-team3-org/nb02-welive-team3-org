export type BoardType = 'COMPLAINT' | 'NOTICE';

export class CreateCommentDto {
  content!: string;
  boardId!: string;
  boardType!: BoardType;
}

export class UpdateCommentDto {
  content!: string;
}

export class CommentResponseDto {
  id!: string;
  userId!: string;
  content!: string;
  createdAt!: string;
  updatedAt!: string;
  writerName!: string;
}

export class BoardInfoDto {
  id!: string;
  boardType!: BoardType;
}

export class CommentWithBoardResponseDto {
  comment!: CommentResponseDto;
  board!: BoardInfoDto;
}

export class CommentsListResponseDto {
  comments!: CommentResponseDto[];
  board!: BoardInfoDto;
  total!: number;
}

export class DeleteCommentResponseDto {
  message!: string;
}