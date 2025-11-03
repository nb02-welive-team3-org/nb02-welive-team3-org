import { Request, Response } from "express";
import * as service from "./complaint.service";
import {
  createComplaintSchema,
  updateComplaintSchema,
  updateComplaintStatusSchema,
} from "./complaint.schema";

/**
 * 민원 등록
 */
export const handleCreateComplaint = async (req: Request, res: Response) => {
  try {
    console.log("=== 민원 등록 요청 ===");
    console.log("Body:", req.body);
    console.log("User:", req.user);

    const data = createComplaintSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "인증이 필요합니다." });
    }

    const result = await service.createComplaintService(data, userId);

    res.status(201).json({ message: "정상적으로 등록 처리되었습니다", data: result });
  } catch (error: any) {
    console.error("=== 민원 등록 에러 ===");
    console.error(error);
    res.status(500).json({ 
      message: "민원 등록 중 오류가 발생했습니다.",
      error: error.message 
    });
  }
};

/**
 * 민원 목록 조회
 */
export const handleGetComplaints = async (req: Request, res: Response) => {
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const response = await service.getComplaintsService(page, limit);
  res.json(response);
};

/**
 * 민원 상세 조회
 */
export const handleGetComplaint = async (req: Request, res: Response) => {
  const { complaintId } = req.params;
  const complaint = await service.getComplaintByIdService(complaintId);
  if (!complaint) {
    return res.status(404).json({ message: "해당 민원을 찾을 수 없습니다." });
  }
  res.json(complaint);
};

/**
 * 민원 수정
 */
export const handleUpdateComplaint = async (req: Request, res: Response) => {
  const { complaintId } = req.params;
  const data = updateComplaintSchema.parse(req.body);
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "인증이 필요합니다." });
  }

  try {
    await service.updateComplaintService(complaintId, data, userId);
    res.json({ message: "정상적으로 수정 처리되었습니다" });
  } catch (error: any) {
    res.status(403).json({ message: error.message });
  }
};

/**
 * 민원 삭제
 */
export const handleDeleteComplaint = async (req: Request, res: Response) => {
  const { complaintId } = req.params;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ message: "인증이 필요합니다." });
  }

  try {
    await service.deleteComplaintService(complaintId, userId);
    res.json({ message: "정상적으로 삭제 처리되었습니다" });
  } catch (error: any) {
    res.status(403).json({ message: error.message });
  }
};

/**
 * 민원 상태 변경 (관리자)
 */
export const handleUpdateComplaintStatus = async (req: Request, res: Response) => {
  const { complaintId } = req.params;
  const data = updateComplaintStatusSchema.parse(req.body);
  const userRole = req.user?.role;

  if (!userRole) {
    return res.status(401).json({ message: "인증이 필요합니다." });
  }

  try {
    const complaint = await service.updateComplaintStatusService(complaintId, data, userRole);
    res.json({ message: "정상적으로 변경되었습니다", data: complaint });
  } catch (error: any) {
    res.status(403).json({ message: error.message });
  }
};
