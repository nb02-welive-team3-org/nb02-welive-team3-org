import { Request, Response } from "express";
import * as controller from "../complaint.controller";
import * as service from "../complaint.service";
import * as schema from "../complaint.schema";

interface AuthenticatedRequest extends Request {
  user?: {
    id?: string;
    role?: string;
  };
}

jest.mock("../complaint.service");
jest.mock("../complaint.schema");

describe("Complaint Controller", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });

    mockRequest = {
      body: {},
      params: {},
      query: {},
      user: undefined,
    };

    mockResponse = {
      status: mockStatus,
      json: mockJson,
    };
  });

  describe("handleCreateComplaint", () => {
    it("정상적으로 민원을 등록해야 함", async () => {
      const mockData = {
        title: "테스트 민원",
        content: "민원 내용",
        isPublic: true,
        boardId: "board-123",
        status: "PENDING" as const,
      };
      mockRequest.body = mockData;
      mockRequest.user = { id: "user-123" };

      (schema.createComplaintSchema.parse as jest.Mock).mockReturnValue(mockData);
      (service.createComplaintService as jest.Mock).mockResolvedValue({});

      await controller.handleCreateComplaint(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(schema.createComplaintSchema.parse).toHaveBeenCalledWith(mockData);
      expect(service.createComplaintService).toHaveBeenCalledWith(mockData, "user-123");
      expect(mockStatus).toHaveBeenCalledWith(201);
      expect(mockJson).toHaveBeenCalledWith({
        message: "정상적으로 등록 처리되었습니다",
      });
    });

    it("인증되지 않은 사용자는 401을 반환해야 함", async () => {
      mockRequest.body = {
        title: "테스트",
        content: "내용",
        isPublic: true,
        boardId: "board-123",
        status: "PENDING" as const,
      };
      mockRequest.user = undefined;

      await controller.handleCreateComplaint(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(service.createComplaintService).not.toHaveBeenCalled();
      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        message: "인증이 필요합니다.",
      });
    });
  });

  describe("handleGetComplaints", () => {
    it("기본 페이지네이션으로 민원 목록을 조회해야 함", async () => {
      mockRequest.query = {};
      const mockData = {
        complaints: [],
        totalCount: 0,
      };
      (service.getComplaintsService as jest.Mock).mockResolvedValue(mockData);

      await controller.handleGetComplaints(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(service.getComplaintsService).toHaveBeenCalledWith(1, 10);
      expect(mockJson).toHaveBeenCalledWith(mockData);
    });

    it("쿼리 파라미터로 페이지와 limit을 설정할 수 있어야 함", async () => {
      mockRequest.query = { page: "2", limit: "20" };
      const mockData = {
        complaints: [],
        totalCount: 0,
      };
      (service.getComplaintsService as jest.Mock).mockResolvedValue(mockData);

      await controller.handleGetComplaints(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(service.getComplaintsService).toHaveBeenCalledWith(2, 20);
    });
  });

  describe("handleGetComplaint", () => {
    it("민원 상세 정보를 조회해야 함", async () => {
      const complaintId = "complaint-123";
      mockRequest.params = { complaintId };
      const mockComplaint = {
        complaintId,
        title: "테스트 민원",
      };
      (service.getComplaintByIdService as jest.Mock).mockResolvedValue(mockComplaint);

      await controller.handleGetComplaint(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(service.getComplaintByIdService).toHaveBeenCalledWith(complaintId);
      expect(mockJson).toHaveBeenCalledWith(mockComplaint);
    });

    it("민원이 존재하지 않으면 404를 반환해야 함", async () => {
      mockRequest.params = { complaintId: "non-existent" };
      (service.getComplaintByIdService as jest.Mock).mockResolvedValue(null);

      await controller.handleGetComplaint(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({
        message: "해당 민원을 찾을 수 없습니다.",
      });
    });
  });

  describe("handleUpdateComplaint", () => {
    it("정상적으로 민원을 수정해야 함", async () => {
      const complaintId = "complaint-123";
      const updateData = { title: "수정된 제목" };
      mockRequest.params = { complaintId };
      mockRequest.body = updateData;
      mockRequest.user = { id: "user-123" };

      (schema.updateComplaintSchema.parse as jest.Mock).mockReturnValue(updateData);
      (service.updateComplaintService as jest.Mock).mockResolvedValue({});

      await controller.handleUpdateComplaint(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(service.updateComplaintService).toHaveBeenCalledWith(
        complaintId,
        updateData,
        "user-123"
      );
      expect(mockJson).toHaveBeenCalledWith({
        message: "정상적으로 수정 처리되었습니다",
      });
    });

    it("인증되지 않은 사용자는 401을 반환해야 함", async () => {
      mockRequest.params = { complaintId: "complaint-123" };
      mockRequest.body = { title: "수정" };
      mockRequest.user = undefined;

      await controller.handleUpdateComplaint(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
      expect(mockJson).toHaveBeenCalledWith({
        message: "인증이 필요합니다.",
      });
    });

    it("권한이 없으면 403을 반환해야 함", async () => {
      mockRequest.params = { complaintId: "complaint-123" };
      mockRequest.body = { title: "수정" };
      mockRequest.user = { id: "user-123" };

      (schema.updateComplaintSchema.parse as jest.Mock).mockReturnValue({ title: "수정" });
      (service.updateComplaintService as jest.Mock).mockRejectedValue(
        new Error("수정 권한이 없습니다.")
      );

      await controller.handleUpdateComplaint(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        message: "수정 권한이 없습니다.",
      });
    });
  });

  describe("handleDeleteComplaint", () => {
    it("정상적으로 민원을 삭제해야 함", async () => {
      const complaintId = "complaint-123";
      mockRequest.params = { complaintId };
      mockRequest.user = { id: "user-123" };

      (service.deleteComplaintService as jest.Mock).mockResolvedValue({});

      await controller.handleDeleteComplaint(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(service.deleteComplaintService).toHaveBeenCalledWith(
        complaintId,
        "user-123"
      );
      expect(mockJson).toHaveBeenCalledWith({
        message: "정상적으로 삭제 처리되었습니다",
      });
    });

    it("인증되지 않은 사용자는 401을 반환해야 함", async () => {
      mockRequest.params = { complaintId: "complaint-123" };
      mockRequest.user = undefined;

      await controller.handleDeleteComplaint(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
    });

    it("권한이 없으면 403을 반환해야 함", async () => {
      mockRequest.params = { complaintId: "complaint-123" };
      mockRequest.user = { id: "user-123" };

      (service.deleteComplaintService as jest.Mock).mockRejectedValue(
        new Error("삭제 권한이 없습니다.")
      );

      await controller.handleDeleteComplaint(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        message: "삭제 권한이 없습니다.",
      });
    });
  });

  describe("handleUpdateComplaintStatus", () => {
    it("관리자가 민원 상태를 변경할 수 있어야 함", async () => {
      const complaintId = "complaint-123";
      const statusData = { status: "IN_PROGRESS" };
      mockRequest.params = { complaintId };
      mockRequest.body = statusData;
      mockRequest.user = { role: "ADMIN" };

      const mockUpdatedComplaint = { complaintId, status: "IN_PROGRESS" };

      (schema.updateComplaintStatusSchema.parse as jest.Mock).mockReturnValue(statusData);
      (service.updateComplaintStatusService as jest.Mock).mockResolvedValue(
        mockUpdatedComplaint
      );

      await controller.handleUpdateComplaintStatus(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(service.updateComplaintStatusService).toHaveBeenCalledWith(
        complaintId,
        statusData,
        "ADMIN"
      );
      expect(mockJson).toHaveBeenCalledWith({
        message: "정상적으로 변경되었습니다",
        data: mockUpdatedComplaint,
      });
    });

    it("인증되지 않은 사용자는 401을 반환해야 함", async () => {
      mockRequest.params = { complaintId: "complaint-123" };
      mockRequest.body = { status: "IN_PROGRESS" };
      mockRequest.user = undefined;

      await controller.handleUpdateComplaintStatus(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(401);
    });

    it("관리자가 아닌 사용자는 403을 반환해야 함", async () => {
      mockRequest.params = { complaintId: "complaint-123" };
      mockRequest.body = { status: "IN_PROGRESS" };
      mockRequest.user = { role: "USER" };

      (schema.updateComplaintStatusSchema.parse as jest.Mock).mockReturnValue({
        status: "IN_PROGRESS",
      });
      (service.updateComplaintStatusService as jest.Mock).mockRejectedValue(
        new Error("상태 변경 권한이 없습니다.")
      );

      await controller.handleUpdateComplaintStatus(
        mockRequest as AuthenticatedRequest,
        mockResponse as Response
      );

      expect(mockStatus).toHaveBeenCalledWith(403);
      expect(mockJson).toHaveBeenCalledWith({
        message: "상태 변경 권한이 없습니다.",
      });
    });
  });
});