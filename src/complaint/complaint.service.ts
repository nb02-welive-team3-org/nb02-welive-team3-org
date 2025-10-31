import { AppDataSource } from "../config/data-source";
import * as repository from "./complaint.repository";
import { CreateComplaintInput, UpdateComplaintInput, UpdateComplaintStatusInput } from "./complaint.schema";
import { ComplaintDetailDto, ComplaintListResponseDto } from "./complaint.dto";
import { createNotification } from "../notofications/notifications.service";
import { NotificationType } from "../entities/notification.entity";
import { User, UserRole } from "../entities/user.entity";
import { ComplaintStatus } from "../entities/complaint.entity";

const userRepo = AppDataSource.getRepository(User);

/**
 * 민원 등록
 */
export async function createComplaintService(data: CreateComplaintInput, userId: string) {
  const user = await userRepo.findOne({
    where: { id: userId },
    relations: { apartment: { complaintBoard: true }, resident: true },
  });

  if (!user) throw new Error("사용자를 찾을 수 없습니다.");

  // boardId 자동 주입
  let boardId = data.boardId;
  if (!boardId) {
    if (!user.apartment?.complaintBoard) {
      throw new Error("아파트 게시판이 설정되어 있지 않습니다.");
    }
    boardId = user.apartment.complaintBoard.id;
  }

  const complaintData = {
    userId,
    boardId,
    dong: user.resident?.building ?? undefined,
    ho: user.resident?.unitNumber ?? undefined,
    title: data.title,
    content: data.content,
    isPublic: data.isPublic,
    status: ComplaintStatus.PENDING,
  };

  const complaint = await repository.createComplaint(complaintData);

  const writer = { id: user.id, name: user.name };

  // 관리자 알림
  const admins = await userRepo.find({
    where: [{ role: UserRole.ADMIN }, { role: UserRole.SUPER_ADMIN }],
    select: ["id"],
  });
  const adminIds = admins.map((a) => a.id);

  if (adminIds.length > 0) {
    await createNotification(
      adminIds,
      `${writer.name}님이 새로운 민원 "${complaint.title}"을 등록했습니다.`,
      NotificationType.COMPLAINT_REQ,
      complaint.complaintId
    );
  }

  return new ComplaintDetailDto(complaint);
}

/**
 * 민원 목록 조회
 */
export async function getComplaintsService(page: number, limit: number) {
  const { complaints, totalCount } = await repository.getComplaints(page, limit);
  return new ComplaintListResponseDto(complaints, totalCount);
}

/**
 * 민원 상세 조회
 */
export async function getComplaintByIdService(complaintId: string) {
  const complaint = await repository.getComplaintById(complaintId);
  return complaint ? new ComplaintDetailDto(complaint) : null;
}

/**
 * 민원 수정
 */
export async function updateComplaintService(complaintId: string, data: UpdateComplaintInput, userId: string) {
  const complaint = await repository.getComplaintById(complaintId);
  if (!complaint) throw new Error("존재하지 않는 민원입니다.");
  if (complaint.userId !== userId) throw new Error("수정 권한이 없습니다.");

  await repository.updateComplaint(complaintId, data);
  return new ComplaintDetailDto({ ...complaint, ...data });
}

/**
 * 민원 삭제
 */
export async function deleteComplaintService(complaintId: string, userId: string) {
  const complaint = await repository.getComplaintById(complaintId);
  if (!complaint) throw new Error("존재하지 않는 민원입니다.");
  if (complaint.userId !== userId) throw new Error("삭제 권한이 없습니다.");

  return await repository.deleteComplaint(complaintId);
}

/**
 * 민원 상태 변경
 */
export async function updateComplaintStatusService(
  complaintId: string,
  data: UpdateComplaintStatusInput,
  userRole: string
) {
  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    throw new Error("상태 변경 권한이 없습니다.");
  }

  const existingComplaint = await repository.getComplaintById(complaintId);
  if (!existingComplaint) throw new Error("존재하지 않는 민원입니다.");

  const updatedComplaint = await repository.updateComplaintStatus(complaintId, data);

  const notificationMap: Partial<Record<ComplaintStatus, { type: NotificationType; message: string }>> = {
    [ComplaintStatus.IN_PROGRESS]: {
      type: NotificationType.COMPLAINT_IN_PROGRESS,
      message: `민원 "${updatedComplaint!.title}"이(가) 처리 중입니다.`,
    },
    [ComplaintStatus.RESOLVED]: {
      type: NotificationType.COMPLAINT_RESOLVED,
      message: `민원 "${updatedComplaint!.title}"이(가) 해결되었습니다.`,
    },
  };

  const notification = notificationMap[data.status];

  if (notification && updatedComplaint) {
    await createNotification([existingComplaint.userId], notification.message, notification.type, complaintId);
  }

  return new ComplaintDetailDto(updatedComplaint!);
}
