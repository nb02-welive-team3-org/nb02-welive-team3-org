import { Request, Response } from "express";
import * as commentService from "../comment.service";
import * as controller from "../comment.controller";
import { ForbiddenError } from "../../types/error.type";

jest.mock("../comment.service");

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role?: string;
  };
}

describe("Comment controller", () => {
  let mockRequest: Partial<AuthenticatedRequest>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  const userUUID = "550e8400-e29b-41d4-a716-446655440001";

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnValue(undefined);
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      body: {},
      params: {},
      user: {
        id: userUUID,
        role: "USER",
      },
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    jest.clearAllMocks();
  });

  /**
   * 댓글 생성 테스트
   */
  describe("createComment", () => {
    it("유효한 데이터로 댓글을 생성하고 201 상태 코드를 반환해야 한다", async () => {
      const mockComment = {
        id: "550e8400-e29b-41d4-a716-446655440002",
        userId: userUUID,
        content: "테스트 댓글",
        boardId: validUUID,
        boardType: "COMPLAINT",
        writerName: "테스트 사용자",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      mockRequest.body = {
        content: "테스트 댓글",
        boardId: validUUID,
        boardType: "COMPLAINT",
      };

      (commentService.createComment as jest.Mock).mockResolvedValue(
        mockComment
      );

      await controller.createComment(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(201);
      expect(jsonMock).toHaveBeenCalledWith({
        comment: {
          id: "550e8400-e29b-41d4-a716-446655440002",
          userId: userUUID,
          content: "테스트 댓글",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
          writerName: "테스트 사용자",
        },
        board: {
          id: validUUID,
          boardType: "COMPLAINT",
        },
      });
    });

    it("인증되지 않은 사용자는 에러를 발생시켜야 한다", async () => {
      mockRequest.body = {
        content: "테스트 댓글",
        boardId: validUUID,
        boardType: "COMPLAINT",
      };
      mockRequest.user = undefined;

      await expect(
        controller.createComment(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow();

      expect(commentService.createComment).not.toHaveBeenCalled();
    });

    it("빈 댓글 내용이면 에러를 발생시켜야 한다", async () => {
      mockRequest.body = {
        content: "",
        boardId: validUUID,
        boardType: "COMPLAINT",
      };

      await expect(
        controller.createComment(
          mockRequest as AuthenticatedRequest,
          mockResponse as Response
        )
      ).rejects.toThrow();
    });

    it("유효하지 않은 UUID 형식이면 에러를 발생시켜야 한다", async () => {
      mockRequest.body = {
        content: "테스트 댓글",
        boardId: "invalid-id",
        boardType: "COMPLAINT",
      };

      await expect(
        controller.createComment(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow();
    });

    it("500자를 초과하는 댓글이면 에러를 발생시켜야 한다", async () => {
      mockRequest.body = {
        content: "a".repeat(501),
        boardId: validUUID,
        boardType: "COMPLAINT",
      };

      await expect(
        controller.createComment(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow();
    });
  });

  /**
   * 댓글 수정 테스트
   */
  describe("updateComment", () => {
    it("유효한 데이터로 댓글을 수정하고 200 상태 코드를 반환해야 한다", async () => {
      const commentId = "550e8400-e29b-41d4-a716-446655440003";
      const mockComment = {
        id: commentId,
        userId: userUUID,
        content: "수정된 댓글",
        boardId: validUUID,
        boardType: "COMPLAINT",
        writerName: "테스트 사용자",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
      };

      mockRequest.body = { content: "수정된 댓글" };
      mockRequest.params = { id: commentId };

      (commentService.updateComment as jest.Mock).mockResolvedValue(
        mockComment
      );

      await controller.updateComment(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        comment: {
          id: commentId,
          userId: userUUID,
          content: "수정된 댓글",
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-02T00:00:00.000Z",
          writerName: "테스트 사용자",
        },
        board: {
          id: validUUID,
          boardType: "COMPLAINT",
        },
      });
    });

    it("서비스에 올바른 매개변수를 전달해야 한다", async () => {
      const commentId = "550e8400-e29b-41d4-a716-446655440003";
      const mockComment = {
        id: commentId,
        userId: userUUID,
        content: "수정된 댓글",
        boardId: validUUID,
        boardType: "COMPLAINT",
        writerName: "테스트 사용자",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockRequest.body = { content: "수정된 댓글" };
      mockRequest.params = { id: commentId };

      (commentService.updateComment as jest.Mock).mockResolvedValue(
        mockComment
      );

      await controller.updateComment(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(commentService.updateComment).toHaveBeenCalledWith({
        id: commentId,
        userId: userUUID,
        content: "수정된 댓글",
      });
    });

    it("인증되지 않은 사용자는 에러를 발생시켜야 한다", async () => {
      mockRequest.params = { id: "comment-123" };
      mockRequest.body = { content: "수정된 댓글" };
      mockRequest.user = undefined;

      await expect(
        controller.updateComment(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow();

      expect(commentService.updateComment).not.toHaveBeenCalled();
    });

    it("권한이 없으면 에러를 발생시켜야 한다", async () => {
      mockRequest.params = { id: "comment-123" };
      mockRequest.body = { content: "수정된 댓글" };
      mockRequest.user = { id: userUUID };

      (commentService.updateComment as jest.Mock).mockRejectedValue(
        new ForbiddenError("본인 댓글만 수정할 수 있습니다.")
      );

      await expect(
        controller.updateComment(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });

  /**
   * 댓글 삭제 테스트
   */
  describe("deleteComment", () => {
    it("댓글을 정상적으로 삭제하고 200 상태 코드를 반환해야 한다", async () => {
      const commentId = "550e8400-e29b-41d4-a716-446655440004";
      mockRequest.params = { id: commentId };
      mockRequest.user = {
        id: userUUID,
        role: "USER",
      };

      (commentService.deleteComment as jest.Mock).mockResolvedValue(undefined);

      await controller.deleteComment(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        message: "정상적으로 삭제 처리되었습니다",
      });
    });

    it("서비스에 userRole을 전달해야 한다", async () => {
      const commentId = "550e8400-e29b-41d4-a716-446655440004";
      mockRequest.params = { id: commentId };
      mockRequest.user = {
        id: userUUID,
        role: "ADMIN",
      };

      (commentService.deleteComment as jest.Mock).mockResolvedValue(undefined);

      await controller.deleteComment(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(commentService.deleteComment).toHaveBeenCalledWith({
        id: commentId,
        userId: userUUID,
        userRole: "ADMIN",
      });
    });

    it("인증되지 않은 사용자는 에러를 발생시켜야 한다", async () => {
      mockRequest.params = { id: "comment-123" };
      mockRequest.user = undefined;

      await expect(
        controller.deleteComment(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow();

      expect(commentService.deleteComment).not.toHaveBeenCalled();
    });

    it("권한이 없으면 에러를 발생시켜야 한다", async () => {
      mockRequest.params = { id: "comment-123" };
      mockRequest.user = { id: userUUID, role: "USER" };

      (commentService.deleteComment as jest.Mock).mockRejectedValue(
        new ForbiddenError("본인 댓글만 삭제할 수 있습니다.")
      );

      await expect(
        controller.deleteComment(
          mockRequest as Request,
          mockResponse as Response
        )
      ).rejects.toThrow(ForbiddenError);
    });
  });
});