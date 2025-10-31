import * as service from "../complaint.service";
import * as repository from "../complaint.repository";
import {
  CreateComplaintInput,
  UpdateComplaintInput,
  UpdateComplaintStatusInput,
} from "../complaint.schema";
import { ComplaintDetailDto, ComplaintListResponseDto } from "../complaint.dto";

jest.mock("../complaint.repository");

describe("Complaint Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 민원 생성 테스트
   */
  describe("createComplaintService", () => {
    it("정상적으로 민원을 등록해야 함", async () => {
      const input: CreateComplaintInput = {
        title: "테스트 민원",
        content: "민원 내용입니다",
        boardId: "board-123",
        isPublic: true,
        status: "PENDING"
      };
      const userId = "user-123";

      const mockComplaintEntity = {
        complaintId: "complaint-1",
        userId: userId,
        boardId: input.boardId,
        title: input.title,
        content: input.content,
        isPublic: input.isPublic,
        status: "PENDING" as const,
        viewsCount: 0,
        commentsCount: 0,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      (repository.createComplaint as jest.Mock).mockResolvedValue(
        mockComplaintEntity
      );

      const result = await service.createComplaintService(input, userId);

      expect(repository.createComplaint).toHaveBeenCalledWith({
        ...input,
        userId,
      });
      expect(repository.createComplaint).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(ComplaintDetailDto);
      expect(result).toMatchObject({
        complaintId: mockComplaintEntity.complaintId,
        title: mockComplaintEntity.title,
        content: mockComplaintEntity.content,
        status: mockComplaintEntity.status,
      });
    });
  });

  /**
   * 민원 목록 조회 테스트
   */
  describe("getComplaintsService", () => {
    it("기본 페이지네이션으로 민원 목록을 조회해야 함", async () => {
      const page = 1;
      const limit = 10;

      const mockComplaints = [
        {
          complaintId: "complaint-1",
          userId: "user-1",
          title: "민원 1",
          content: "내용 1",
          status: "PENDING" as const,
          isPublic: true,
          viewsCount: 10,
          commentsCount: 2,
          createdAt: new Date("2025-01-01"),
          updatedAt: new Date("2025-01-01"),
        },
        {
          complaintId: "complaint-2",
          userId: "user-2",
          title: "민원 2",
          content: "내용 2",
          status: "IN_PROGRESS" as const,
          isPublic: true,
          viewsCount: 5,
          commentsCount: 1,
          createdAt: new Date("2025-01-02"),
          updatedAt: new Date("2025-01-02"),
        },
      ];

      const mockTotalCount = 25;

      (repository.getComplaints as jest.Mock).mockResolvedValue({
        complaints: mockComplaints,
        totalCount: mockTotalCount,
      });

      const result = await service.getComplaintsService(page, limit);

      expect(repository.getComplaints).toHaveBeenCalledWith(page, limit);
      expect(repository.getComplaints).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(ComplaintListResponseDto);
      expect(result).toMatchObject({
        complaints: expect.any(Array),
        totalCount: mockTotalCount,
      });
      expect(result.complaints).toHaveLength(mockComplaints.length);
    });
  });

  /**
   * 민원 상세 조회 테스트
   */
  describe("getComplaintByIdService", () => {
    it("민원 상세 정보를 조회해야 함", async () => {

      const complaintId = "complaint-1";
      const mockComplaint = {
        complaintId: complaintId,
        userId: "user-1",
        title: "테스트 민원",
        content: "민원 내용",
        status: "PENDING" as const,
        isPublic: true,
        viewsCount: 10,
        commentsCount: 2,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      (repository.getComplaintById as jest.Mock).mockResolvedValue(
        mockComplaint
      );

      const result = await service.getComplaintByIdService(complaintId);

      expect(repository.getComplaintById).toHaveBeenCalledWith(complaintId);
      expect(repository.getComplaintById).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(ComplaintDetailDto);
      expect(result).toMatchObject({
        complaintId: mockComplaint.complaintId,
        title: mockComplaint.title,
      });
    });

    it("민원이 존재하지 않으면 404를 반환해야 함", async () => {
      const complaintId = "non-existent-id";
      
      (repository.getComplaintById as jest.Mock).mockResolvedValue(null);

      const result = await service.getComplaintByIdService(complaintId);

      expect(repository.getComplaintById).toHaveBeenCalledWith(complaintId);
      expect(result).toBeNull();
    });
  });

  /**
   * 민원 수정 테스트
   */
  describe("updateComplaintService", () => {
    it("정상적으로 민원을 수정해야 함", async () => {
      const complaintId = "complaint-1";
      const userId = "user-1";
      const updateInput: UpdateComplaintInput = {
        title: "수정된 제목",
        content: "수정된 내용",
      };

      const mockExistingComplaint = {
        complaintId: complaintId,
        userId: userId,
        title: "원래 제목",
        content: "원래 내용",
        status: "PENDING" as const,
        isPublic: true,
        viewsCount: 10,
        commentsCount: 2,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      (repository.getComplaintById as jest.Mock).mockResolvedValue(
        mockExistingComplaint
      );
      (repository.updateComplaint as jest.Mock).mockResolvedValue(undefined);

      const result = await service.updateComplaintService(
        complaintId,
        updateInput,
        userId
      );

      expect(repository.getComplaintById).toHaveBeenCalledWith(complaintId);
      expect(repository.updateComplaint).toHaveBeenCalledWith(
        complaintId,
        updateInput
      );
      expect(repository.updateComplaint).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(ComplaintDetailDto);
      expect(result).toMatchObject({
        complaintId: complaintId,
        title: updateInput.title,
        content: updateInput.content,
      });
    });

    it("권한이 없으면 403을 반환해야 함", async () => {
      const complaintId = "complaint-1";
      const actualUserId = "user-1";
      const attemptingUserId = "user-2";
      const updateInput: UpdateComplaintInput = {
        title: "수정된 제목",
      };

      const mockExistingComplaint = {
        complaintId: complaintId,
        userId: actualUserId,
        title: "원래 제목",
        content: "원래 내용",
        status: "PENDING" as const,
        isPublic: true,
        viewsCount: 10,
        commentsCount: 2,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      (repository.getComplaintById as jest.Mock).mockResolvedValue(
        mockExistingComplaint
      );

      await expect(
        service.updateComplaintService(complaintId, updateInput, attemptingUserId)
      ).rejects.toThrow("수정 권한이 없습니다.");

      expect(repository.updateComplaint).not.toHaveBeenCalled();
    });
  });

  /**
   * 민원 삭제 테스트
   */
  describe("deleteComplaintService", () => {
    it("정상적으로 민원을 삭제해야 함", async () => {
      const complaintId = "complaint-1";
      const userId = "user-1";

      const mockExistingComplaint = {
        complaintId: complaintId,
        userId: userId,
        title: "삭제할 민원",
        content: "내용",
        status: "PENDING" as const,
        isPublic: true,
        viewsCount: 10,
        commentsCount: 2,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      (repository.getComplaintById as jest.Mock).mockResolvedValue(
        mockExistingComplaint
      );
      (repository.deleteComplaint as jest.Mock).mockResolvedValue(true);

      const result = await service.deleteComplaintService(complaintId, userId);

      expect(repository.getComplaintById).toHaveBeenCalledWith(complaintId);
      expect(repository.deleteComplaint).toHaveBeenCalledWith(complaintId);
      expect(repository.deleteComplaint).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it("권한이 없으면 403을 반환해야 함", async () => {
      const complaintId = "complaint-1";
      const actualUserId = "user-1";
      const attemptingUserId = "user-2";

      const mockExistingComplaint = {
        complaintId: complaintId,
        userId: actualUserId,
        title: "삭제할 민원",
        content: "내용",
        status: "PENDING" as const,
        isPublic: true,
        viewsCount: 10,
        commentsCount: 2,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-01"),
      };

      (repository.getComplaintById as jest.Mock).mockResolvedValue(
        mockExistingComplaint
      );

      await expect(
        service.deleteComplaintService(complaintId, attemptingUserId)
      ).rejects.toThrow("삭제 권한이 없습니다.");

      expect(repository.deleteComplaint).not.toHaveBeenCalled();
    });
  });

  /**
   * 민원 상태 변경 테스트 (관리자 전용)
   */
  describe("updateComplaintStatusService", () => {
    it("관리자가 민원 상태를 변경할 수 있어야 함", async () => {
      const complaintId = "complaint-1";
      const statusInput: UpdateComplaintStatusInput = {
        status: "RESOLVED",
      };
      const adminRole = "ADMIN";

      const mockUpdatedComplaint = {
        complaintId: complaintId,
        userId: "user-1",
        title: "민원 제목",
        content: "민원 내용",
        status: "RESOLVED" as const,
        isPublic: true,
        viewsCount: 10,
        commentsCount: 2,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-02"),
      };

      (repository.updateComplaintStatus as jest.Mock).mockResolvedValue(
        mockUpdatedComplaint
      );

      const result = await service.updateComplaintStatusService(
        complaintId,
        statusInput,
        adminRole
      );

      expect(repository.updateComplaintStatus).toHaveBeenCalledWith(
        complaintId,
        statusInput
      );
      expect(repository.updateComplaintStatus).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(ComplaintDetailDto);
      expect(result).toMatchObject({
        complaintId: complaintId,
        status: "RESOLVED",
      });
    });

    it("관리자가 아닌 사용자는 403을 반환해야 함", async () => {
      const complaintId = "complaint-1";
      const statusInput: UpdateComplaintStatusInput = {
        status: "RESOLVED",
      };
      const userRole = "USER";

      await expect(
        service.updateComplaintStatusService(complaintId, statusInput, userRole)
      ).rejects.toThrow("상태 변경 권한이 없습니다.");

      expect(repository.updateComplaintStatus).not.toHaveBeenCalled();
    });
  });
});
