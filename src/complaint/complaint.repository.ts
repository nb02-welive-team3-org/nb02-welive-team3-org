import { AppDataSource } from "../config/data-source";
import { Complaint, ComplaintStatus } from "../entities/complaint.entity";
import {
  CreateComplaintInput,
  UpdateComplaintInput,
  UpdateComplaintStatusInput,
} from "./complaint.schema";

const complaintRepository = AppDataSource.getRepository(Complaint);

export async function createComplaint(
  data: CreateComplaintInput & { userId: string; boardId: string } // boardId 필수
) {
  const complaintData = {
    ...data,
    status: data.status || ComplaintStatus.PENDING,
  };
  return await complaintRepository.save(complaintData);
}

export async function getComplaints(page: number, limit: number) {
  const skip = (page - 1) * limit;
  const [complaints, totalCount] = await complaintRepository.findAndCount({
    skip,
    take: limit,
    order: { createdAt: "DESC" },
    relations: ["user", "complaintBoard", "comments"],
  });

  complaints.forEach((c) => {
    if (!c.comments) c.comments = [];
  });

  return { complaints, totalCount };
}

export async function getComplaintById(complaintId: string) {
  const complaint = await complaintRepository.findOne({
    where: { complaintId },
    relations: ["user", "complaintBoard", "comments", "comments.user"],
  });

  if (!complaint) return null;
  if (!complaint.comments) complaint.comments = [];

  return complaint;
}

export async function updateComplaint(complaintId: string, data: UpdateComplaintInput) {
  await complaintRepository.update({ complaintId }, data);
}

export async function deleteComplaint(complaintId: string) {
  return await complaintRepository.delete({ complaintId });
}

export async function updateComplaintStatus(complaintId: string, data: UpdateComplaintStatusInput) {
  await complaintRepository.update({ complaintId }, { status: data.status as ComplaintStatus });
  const complaint = await getComplaintById(complaintId);
  return complaint;
}