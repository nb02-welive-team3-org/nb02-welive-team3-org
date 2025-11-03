import { Comment } from "../entities/comment.entity";
import { ComplaintStatus } from "../entities/complaint.entity";

export class CreateComplaintDto {
  title!: string;
  content!: string;
  isPublic?: boolean;
  boardId?: string;
  status?: ComplaintStatus;
}

export class UpdateComplaintDto {
  title?: string;
  content?: string;
  isPublic?: boolean;
}

export class UpdateComplaintStatusDto {
  status!: ComplaintStatus;
}

export class ComplaintListItemDto {
  complaintId!: string;
  userId!: string;
  title!: string;
  writerName!: string;
  createdAt!: Date;
  updatedAt!: Date;
  isPublic!: boolean;
  viewsCount!: number;
  commentsCount!: number;
  status!: ComplaintStatus;
  dong?: string;
  ho?: string;

  constructor(entity: any) {
    this.complaintId = entity.complaintId;
    this.userId = entity.userId;
    this.title = entity.title;
    this.writerName = entity.user?.name ?? "익명";
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
    this.isPublic = entity.isPublic;
    this.viewsCount = entity.viewsCount;
    this.commentsCount = entity.commentsCount;
    this.status = entity.status;
    this.dong = entity.dong;
    this.ho = entity.ho;
  }
}

export class ComplaintListResponseDto {
  complaints!: ComplaintListItemDto[];
  totalCount!: number;

  constructor(entities: any[], totalCount: number) {
    this.complaints = entities.map((c) => new ComplaintListItemDto(c));
    this.totalCount = totalCount;
  }
}

export class ComplaintDetailDto {
  complaintId!: string;
  userId!: string;
  title!: string;
  writerName!: string;
  createdAt!: Date;
  updatedAt!: Date;
  isPublic!: boolean;
  viewsCount!: number;
  commentsCount!: number;
  status!: ComplaintStatus;
  dong?: string;
  ho?: string;
  content!: string;
  comments: Comment[];

  constructor(entity: any) {
    this.complaintId = entity.complaintId;
    this.userId = entity.userId;
    this.title = entity.title;
    this.writerName = entity.user?.name ?? "익명";
    this.createdAt = entity.createdAt;
    this.updatedAt = entity.updatedAt;
    this.isPublic = entity.isPublic;
    this.viewsCount = entity.viewsCount;
    this.commentsCount = entity.commentsCount;
    this.status = entity.status;
    this.dong = entity.dong;
    this.ho = entity.ho;
    this.content = entity.content;
    this.comments = entity.comments;
  }
}
