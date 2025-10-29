export class CreateCommentDto {
  content!: string;
  boardId!: string;
  boardType!: 'COMPLAINT' | 'NOTICE';;
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
  boardType!: 'COMPLAINT' | 'NOTICE';;
}

export class CommentWithBoardResponseDto {
  comment!: CommentResponseDto;
  board!: BoardInfoDto;
}

export class DeleteCommentResponseDto {
  message!: string;
}