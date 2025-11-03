import * as commentRepository from "../comment.repository";
import * as commentService from "../comment.service";
import { ForbiddenError, NotFoundError } from "../../types/error.type";

jest.mock("../comment.repository");

describe("Comment Service", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";
  const userUUID = "550e8400-e29b-41d4-a716-446655440001";
  const commentId = "550e8400-e29b-41d4-a716-446655440002";

  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * 댓글 생성 테스트
   */
  describe("createComment", () => {
    it("민원 게시판에 댓글을 생성해야 한다", async () => {
      const mockComment = {
        id: commentId,
        userId: userUUID,
        content: "테스트 댓글",
        boardId: validUUID,
        boardType: "COMPLAINT" as const,
        writerName: "테스트 사용자",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      (commentRepository.createComment as jest.Mock).mockResolvedValue(
        mockComment
      );

      const result = await commentService.createComment({
        userId: userUUID,
        content: "테스트 댓글",
        boardId: validUUID,
        boardType: "COMPLAINT",
      });

      expect(commentRepository.createComment).toHaveBeenCalledWith({
        userId: userUUID,
        content: "테스트 댓글",
        boardId: validUUID,
        boardType: "COMPLAINT",
      });
      expect(commentRepository.createComment).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockComment);
    });

    it("공지사항에 댓글을 생성해야 한다", async () => {
      const mockComment = {
        id: "other-comment-id",
        userId: userUUID,
        content: "공지사항 댓글",
        boardId: "notice-board-id",
        boardType: "NOTICE" as const,
        writerName: "테스트 사용자",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (commentRepository.createComment as jest.Mock).mockResolvedValue(
        mockComment
      );

      const result = await commentService.createComment({
        userId: userUUID,
        content: "공지사항 댓글",
        boardId: "notice-board-id",
        boardType: "NOTICE",
      });

      expect(commentRepository.createComment).toHaveBeenCalledWith({
        userId: userUUID,
        content: "공지사항 댓글",
        boardId: "notice-board-id",
        boardType: "NOTICE",
      });
      expect(commentRepository.createComment).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockComment);
    });

    it("저장소에서 에러가 발생하면 에러를 전파해야 한다", async () => {
      (commentRepository.createComment as jest.Mock).mockRejectedValue(
        new NotFoundError("유저를 찾을 수 없습니다.")
      );

      await expect(
        commentService.createComment({
          userId: userUUID,
          content: "테스트 댓글",
          boardId: validUUID,
          boardType: "COMPLAINT",
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  /**
   * 댓글 조회 테스트
   */
  describe("getComments", () => {
    it("민원 게시판의 댓글을 조회해야 한다", async () => {
      const mockComments = [
        {
          id: "comment-1",
          userId: "user-1",
          content: "첫 번째 댓글",
          writerName: "사용자1",
          createdAt: new Date("2024-01-01"),
          updatedAt: new Date("2024-01-01"),
        },
        {
          id: "comment-2",
          userId: "user-2",
          content: "두 번째 댓글",
          writerName: "사용자2",
          createdAt: new Date("2024-01-02"),
          updatedAt: new Date("2024-01-02"),
        },
      ];

      (commentRepository.getCommentsByBoard as jest.Mock).mockResolvedValue(
        mockComments
      );

      const result = await commentService.getComments({
        boardId: validUUID,
        boardType: "COMPLAINT",
      });

      expect(commentRepository.getCommentsByBoard).toHaveBeenCalledWith({
        boardId: validUUID,
        boardType: "COMPLAINT",
      });
      expect(commentRepository.getCommentsByBoard).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockComments);
      expect(result).toHaveLength(2);
    });

    it("공지사항의 댓글을 조회해야 한다", async () => {
      const mockComments = [
        {
          id: "comment-3",
          userId: "user-3",
          content: "공지사항 댓글",
          writerName: "사용자3",
          createdAt: new Date("2024-01-03"),
          updatedAt: new Date("2024-01-03"),
        },
      ];

      (commentRepository.getCommentsByBoard as jest.Mock).mockResolvedValue(
        mockComments
      );

      const result = await commentService.getComments({
        boardId: "notice-board-id",
        boardType: "NOTICE",
      });

      expect(commentRepository.getCommentsByBoard).toHaveBeenCalledWith({
        boardId: "notice-board-id",
        boardType: "NOTICE",
      });
      expect(result).toHaveLength(1);
    });

    it("게시물이 존재하지 않으면 에러를 발생시켜야 한다", async () => {
      (commentRepository.getCommentsByBoard as jest.Mock).mockRejectedValue(
        new NotFoundError("민원을 찾을 수 없습니다.")
      );

      await expect(
        commentService.getComments({
          boardId: "non-existent",
          boardType: "COMPLAINT",
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  /**
   * 댓글 수정 테스트
   */
  describe("updateComment", () => {
    it("작성자가 댓글을 정상적으로 수정해야 한다", async () => {
      const existingComment = {
        id: commentId,
        userId: userUUID,
        content: "기존 댓글",
        writerName: "테스트 사용자",
        complaintId: validUUID,
        noticeId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      const updatedComment = {
        id: commentId,
        userId: userUUID,
        content: "수정된 댓글",
        writerName: "테스트 사용자",
        boardId: validUUID,
        boardType: "COMPLAINT" as const,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-02"),
      };

      (commentRepository.findById as jest.Mock).mockResolvedValue(
        existingComment
      );
      (commentRepository.updateComment as jest.Mock).mockResolvedValue(
        updatedComment
      );

      const result = await commentService.updateComment({
        id: commentId,
        userId: userUUID,
        content: "수정된 댓글",
      });

      expect(commentRepository.findById).toHaveBeenCalledWith(commentId);
      expect(commentRepository.updateComment).toHaveBeenCalledWith({
        id: commentId,
        content: "수정된 댓글",
      });
      expect(commentRepository.updateComment).toHaveBeenCalledTimes(1);
      expect(result).toEqual(updatedComment);
      expect(result.content).toBe("수정된 댓글");
    });

    it("존재하지 않는 댓글이면 NotFoundError를 발생시켜야 한다", async () => {
      (commentRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        commentService.updateComment({
          id: "non-existent",
          userId: userUUID,
          content: "수정된 댓글",
        })
      ).rejects.toThrow(NotFoundError);
      expect(commentRepository.updateComment).not.toHaveBeenCalled();
    });

    it("작성자가 아니면 ForbiddenError를 발생시켜야 한다", async () => {
      const existingComment = {
        id: commentId,
        userId: "other-user",
        content: "기존 댓글",
        writerName: "다른 사용자",
        complaintId: validUUID,
        noticeId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      (commentRepository.findById as jest.Mock).mockResolvedValue(
        existingComment
      );

      await expect(
        commentService.updateComment({
          id: commentId,
          userId: userUUID,
          content: "수정된 댓글",
        })
      ).rejects.toThrow(ForbiddenError);
      expect(commentRepository.updateComment).not.toHaveBeenCalled();
    });

    it("작성자가 아닐 때 올바른 에러 메시지를 반환해야 한다", async () => {
      const existingComment = {
        id: commentId,
        userId: "other-user",
        content: "기존 댓글",
        writerName: "다른 사용자",
        complaintId: validUUID,
        noticeId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      (commentRepository.findById as jest.Mock).mockResolvedValue(
        existingComment
      );

      try {
        await commentService.updateComment({
          id: commentId,
          userId: userUUID,
          content: "수정된 댓글",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).message).toBe(
          "본인 댓글만 수정할 수 있습니다."
        );
      }
    });
  });

  /**
   * 댓글 삭제 테스트
   */
  describe("deleteComment", () => {
    it("작성자가 댓글을 정상적으로 삭제해야 한다", async () => {
      const existingComment = {
        id: commentId,
        userId: userUUID,
        content: "삭제할 댓글",
        writerName: "테스트 사용자",
        complaintId: validUUID,
        noticeId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      (commentRepository.findById as jest.Mock).mockResolvedValue(
        existingComment
      );
      (commentRepository.deleteComment as jest.Mock).mockResolvedValue(
        undefined
      );

      await commentService.deleteComment({
        id: commentId,
        userId: userUUID,
      });

      expect(commentRepository.findById).toHaveBeenCalledWith(commentId);
      expect(commentRepository.deleteComment).toHaveBeenCalledWith(commentId);
      expect(commentRepository.deleteComment).toHaveBeenCalledTimes(1);
    });

    it("ADMIN 권한이 있으면 다른 사용자의 댓글을 삭제할 수 있어야 한다", async () => {
      const existingComment = {
        id: commentId,
        userId: "other-user",
        content: "삭제할 댓글",
        writerName: "다른 사용자",
        complaintId: validUUID,
        noticeId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      (commentRepository.findById as jest.Mock).mockResolvedValue(
        existingComment
      );
      (commentRepository.deleteComment as jest.Mock).mockResolvedValue(
        undefined
      );

      await commentService.deleteComment({
        id: commentId,
        userId: "admin-user",
        userRole: "ADMIN",
      });

      expect(commentRepository.deleteComment).toHaveBeenCalledWith(commentId);
      expect(commentRepository.deleteComment).toHaveBeenCalledTimes(1);
    });

    it("SUPER_ADMIN 권한이 있으면 다른 사용자의 댓글을 삭제할 수 있어야 한다", async () => {
      const existingComment = {
        id: commentId,
        userId: "other-user",
        content: "삭제할 댓글",
        writerName: "다른 사용자",
        complaintId: validUUID,
        noticeId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      (commentRepository.findById as jest.Mock).mockResolvedValue(
        existingComment
      );
      (commentRepository.deleteComment as jest.Mock).mockResolvedValue(
        undefined
      );

      await commentService.deleteComment({
        id: commentId,
        userId: "super-admin",
        userRole: "SUPER_ADMIN",
      });

      expect(commentRepository.deleteComment).toHaveBeenCalledWith(commentId);
      expect(commentRepository.deleteComment).toHaveBeenCalledTimes(1);
    });

    it("존재하지 않는 댓글이면 NotFoundError를 발생시켜야 한다", async () => {
      (commentRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(
        commentService.deleteComment({
          id: "non-existent",
          userId: userUUID,
        })
      ).rejects.toThrow(NotFoundError);
      expect(commentRepository.deleteComment).not.toHaveBeenCalled();
    });

    it("일반 사용자가 다른 사용자의 댓글을 삭제하려면 ForbiddenError를 발생시켜야 한다", async () => {
      const existingComment = {
        id: commentId,
        userId: "other-user",
        content: "삭제할 댓글",
        writerName: "다른 사용자",
        complaintId: validUUID,
        noticeId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      (commentRepository.findById as jest.Mock).mockResolvedValue(
        existingComment
      );

      await expect(
        commentService.deleteComment({
          id: commentId,
          userId: userUUID,
          userRole: "USER",
        })
      ).rejects.toThrow(ForbiddenError);
      expect(commentRepository.deleteComment).not.toHaveBeenCalled();
    });

    it("삭제 권한이 없을 때 올바른 에러 메시지를 반환해야 한다", async () => {
      const existingComment = {
        id: commentId,
        userId: "other-user",
        content: "삭제할 댓글",
        writerName: "다른 사용자",
        complaintId: validUUID,
        noticeId: null,
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
      };

      (commentRepository.findById as jest.Mock).mockResolvedValue(
        existingComment
      );

      try {
        await commentService.deleteComment({
          id: commentId,
          userId: userUUID,
          userRole: "USER",
        });
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as ForbiddenError).message).toBe(
          "본인 댓글만 삭제할 수 있습니다."
        );
      }
    });
  });
});