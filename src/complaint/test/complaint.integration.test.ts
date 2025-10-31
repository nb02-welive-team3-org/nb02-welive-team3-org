import request from "supertest";
import { DataSource } from "typeorm";
import { Complaint, ComplaintStatus } from "../../entities/complaint.entity";
import { User, UserRole } from "../../entities/user.entity";
import { ComplaintBoard } from "../../entities/complaint-board.entity";
import { Apartment } from "../../entities/apartment.entity";
import app from "../../app";
import * as dotenv from "dotenv";

dotenv.config();

describe("Complaint Integration Tests", () => {
  let dataSource: DataSource;
  let authToken: string;
  let testUserId: string;
  let adminToken: string;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432"),
      username: process.env.DB_USERNAME || "postgres",
      password: process.env.DB_PASSWORD || "",
      database: "test_db",
      entities: [User, Complaint, ComplaintBoard, Apartment],
      synchronize: true,
      logging: false,
      dropSchema: true,
    });
    
    await dataSource.initialize();

    const userRepo = dataSource.getRepository(User);

    // 일반 유저
    const testUser = userRepo.create({
      username: "testuser",
      email: "test@example.com",
      password: "hashedPassword123",
      name: "테스트 유저",
      contact: "010-1234-5678",
      role: UserRole.USER,
    });
    const savedUser = await userRepo.save(testUser);
    testUserId = savedUser.id;
    authToken = "Bearer mock-user-token-" + testUserId;

    // 관리자
    const adminUser = userRepo.create({
      username: "adminuser",
      email: "admin@example.com",
      password: "hashedPassword123",
      name: "관리자",
      contact: "010-9999-9999",
      role: UserRole.ADMIN,
    });
    const savedAdmin = await userRepo.save(adminUser);
    adminToken = "Bearer mock-admin-token-" + savedAdmin.id;
  }, 30000);

  afterAll(async () => {
    if (dataSource && dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }, 10000);

  beforeEach(async () => {
    await dataSource.getRepository(Complaint).clear();
  });

  // =========================
  // POST /complaints
  // =========================
  describe("POST /complaints", () => {
    it("정상적으로 민원을 등록해야 함", async () => {
      const newComplaint = {
        title: "통합 테스트 민원",
        content: "민원 내용입니다",
        boardId: "board-123",
        isPublic: true,
      };

      const response = await request(app)
        .post("/complaints")
        .set("Authorization", authToken)
        .send(newComplaint);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe("정상적으로 등록 처리되었습니다");

      const complaintRepo = dataSource.getRepository(Complaint);
      const savedComplaint = await complaintRepo.findOne({
        where: { title: newComplaint.title },
      });
      expect(savedComplaint).toBeDefined();
      expect(savedComplaint?.userId).toBe(testUserId);
      expect(savedComplaint?.title).toBe(newComplaint.title);
      expect(savedComplaint?.content).toBe(newComplaint.content);
      expect(savedComplaint?.status).toBe("PENDING");
    });

    it("인증되지 않은 사용자는 401을 반환해야 함", async () => {
      const response = await request(app)
        .post("/complaints")
        .send({ title: "테스트", content: "내용", boardId: "board-123" });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe("인증이 필요합니다.");

      const count = await dataSource.getRepository(Complaint).count();
      expect(count).toBe(0);
    });

    it("필수 필드가 없으면 400을 반환해야 함", async () => {
      const response = await request(app)
        .post("/complaints")
        .set("Authorization", authToken)
        .send({ title: "제목만 있음" });

      expect(response.status).toBe(400);

      const count = await dataSource.getRepository(Complaint).count();
      expect(count).toBe(0);
    });
  });

  // =========================
  // GET /complaints
  // =========================
  describe("GET /complaints", () => {
    beforeEach(async () => {
      const complaintRepo = dataSource.getRepository(Complaint);
      const complaints = [];
      for (let i = 1; i <= 15; i++) {
        const complaint = complaintRepo.create({
          userId: testUserId,
          title: `테스트 민원 ${i}`,
          content: `내용 ${i}`,
          boardId: "board-123",
          isPublic: true,
          status: ComplaintStatus.PENDING,
        });
        complaints.push(complaint);
      }
      await complaintRepo.save(complaints);
    });

    it("기본 페이지네이션으로 민원 목록 조회", async () => {
      const response = await request(app).get("/complaints");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("complaints");
      expect(response.body).toHaveProperty("totalCount");
      expect(Array.isArray(response.body.complaints)).toBe(true);
      expect(response.body.totalCount).toBe(15);
      expect(response.body.complaints.length).toBeLessThanOrEqual(10);
    });

    it("쿼리 파라미터로 페이지와 limit 설정 가능", async () => {
      const response = await request(app).get("/complaints").query({ page: 2, limit: 5 });
      expect(response.status).toBe(200);
      expect(response.body.complaints.length).toBeLessThanOrEqual(5);
      expect(response.body.totalCount).toBe(15);
    });
  });

  // =========================
  // GET /complaints/:complaintId
  // =========================
  describe("GET /complaints/:complaintId", () => {
    let testComplaintId: string;

    beforeEach(async () => {
      const complaintRepo = dataSource.getRepository(Complaint);
      const complaint = complaintRepo.create({
        userId: testUserId,
        title: "상세 조회용 민원",
        content: "상세 내용",
        boardId: "board-123",
        isPublic: true,
        status: ComplaintStatus.PENDING,
      });
      const saved = await complaintRepo.save(complaint);
      testComplaintId = saved.complaintId;
    });

    it("민원 상세 조회", async () => {
      const response = await request(app).get(`/complaints/${testComplaintId}`);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("complaintId", testComplaintId);
      expect(response.body).toHaveProperty("title", "상세 조회용 민원");
      expect(response.body).toHaveProperty("content", "상세 내용");
      expect(response.body).toHaveProperty("status", "PENDING");
    });

    it("존재하지 않는 민원은 404", async () => {
      const response = await request(app).get("/complaints/non-existent-id-12345");
      expect(response.status).toBe(404);
      expect(response.body.message).toBe("해당 민원을 찾을 수 없습니다.");
    });
  });

  // =========================
  // PATCH /complaints/:complaintId
  // =========================
  describe("PATCH /complaints/:complaintId", () => {
    let testComplaintId: string;
    let otherUserToken: string;

    beforeEach(async () => {
      const complaintRepo = dataSource.getRepository(Complaint);
      const complaint = complaintRepo.create({
        userId: testUserId,
        title: "수정 테스트 민원",
        content: "원래 내용",
        boardId: "board-123",
        isPublic: true,
        status: ComplaintStatus.PENDING,
      });
      const saved = await complaintRepo.save(complaint);
      testComplaintId = saved.complaintId;

      const userRepo = dataSource.getRepository(User);
      const otherUser = userRepo.create({
        username: "otheruser",
        email: "other@example.com",
        password: "hashedPassword123",
        name: "다른 유저",
        contact: "010-1111-1111",
        role: UserRole.USER,
      });
      const savedOther = await userRepo.save(otherUser);
      otherUserToken = "Bearer mock-other-token-" + savedOther.id;
    });

    it("정상 수정", async () => {
      const updateData = { title: "수정된 제목", content: "수정된 내용" };
      const response = await request(app)
        .patch(`/complaints/${testComplaintId}`)
        .set("Authorization", authToken)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("정상적으로 수정 처리되었습니다");

      const updated = await dataSource.getRepository(Complaint).findOne({
        where: { complaintId: testComplaintId },
      });
      expect(updated?.title).toBe(updateData.title);
      expect(updated?.content).toBe(updateData.content);
    });

    it("권한 없으면 403", async () => {
      const response = await request(app)
        .patch(`/complaints/${testComplaintId}`)
        .set("Authorization", otherUserToken)
        .send({ title: "수정 시도" });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("수정 권한이 없습니다.");
    });
  });

  // =========================
  // DELETE /complaints/:complaintId
  // =========================
  describe("DELETE /complaints/:complaintId", () => {
    let testComplaintId: string;
    let otherUserToken: string;

    beforeEach(async () => {
      const complaintRepo = dataSource.getRepository(Complaint);
      const complaint = complaintRepo.create({
        userId: testUserId,
        title: "삭제 테스트 민원",
        content: "내용",
        boardId: "board-123",
        isPublic: true,
        status: ComplaintStatus.PENDING,
      });
      const saved = await complaintRepo.save(complaint);
      testComplaintId = saved.complaintId;

      const userRepo = dataSource.getRepository(User);
      const otherUser = userRepo.create({
        username: "otheruser2",
        email: "other2@example.com",
        password: "hashedPassword123",
        name: "다른 유저2",
        contact: "010-2222-2222",
        role: UserRole.USER,
      });
      const savedOther = await userRepo.save(otherUser);
      otherUserToken = "Bearer mock-other2-token-" + savedOther.id;
    });

    it("정상 삭제", async () => {
      const response = await request(app)
        .delete(`/complaints/${testComplaintId}`)
        .set("Authorization", authToken);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("정상적으로 삭제 처리되었습니다");

      const deleted = await dataSource.getRepository(Complaint).findOne({
        where: { complaintId: testComplaintId },
      });
      expect(deleted).toBeNull();
    });

    it("권한 없으면 403", async () => {
      const response = await request(app)
        .delete(`/complaints/${testComplaintId}`)
        .set("Authorization", otherUserToken);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("삭제 권한이 없습니다.");
    });
  });

  // =========================
  // PATCH /complaints/:complaintId/status
  // =========================
  describe("PATCH /complaints/:complaintId/status", () => {
    let testComplaintId: string;

    beforeEach(async () => {
      const complaintRepo = dataSource.getRepository(Complaint);
      const complaint = complaintRepo.create({
        userId: testUserId,
        title: "상태 변경 테스트",
        content: "내용",
        boardId: "board-123",
        isPublic: true,
        status: ComplaintStatus.PENDING,
      });
      const saved = await complaintRepo.save(complaint);
      testComplaintId = saved.complaintId;
    });

    it("관리자가 상태 변경 가능", async () => {
      const statusUpdate = { status: "RESOLVED" };
      const response = await request(app)
        .patch(`/complaints/${testComplaintId}/status`)
        .set("Authorization", adminToken)
        .send(statusUpdate);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("정상적으로 변경되었습니다");
      expect(response.body.data.status).toBe("RESOLVED");

      const updated = await dataSource.getRepository(Complaint).findOne({
        where: { complaintId: testComplaintId },
      });
      expect(updated?.status).toBe("RESOLVED");
    });

    it("관리자가 아니면 403", async () => {
      const response = await request(app)
        .patch(`/complaints/${testComplaintId}/status`)
        .set("Authorization", authToken)
        .send({ status: "RESOLVED" });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("상태 변경 권한이 없습니다.");
    });
  });

  // =========================
  // 전체 플로우 테스트
  // =========================
  describe("복합 시나리오", () => {
    it("생성 → 조회 → 수정 → 삭제 플로우 정상 작동", async () => {
      const createResponse = await request(app)
        .post("/complaints")
        .set("Authorization", authToken)
        .send({
          title: "플로우 테스트",
          content: "내용",
          boardId: "board-123",
          isPublic: true,
        });

      expect(createResponse.status).toBe(201);

      const complaintRepo = dataSource.getRepository(Complaint);
      const created = await complaintRepo.findOne({ where: { title: "플로우 테스트" } });
      const complaintId = created!.complaintId;

      const getResponse = await request(app).get(`/complaints/${complaintId}`);
      expect(getResponse.status).toBe(200);
      expect(getResponse.body.title).toBe("플로우 테스트");

      const updateResponse = await request(app)
        .patch(`/complaints/${complaintId}`)
        .set("Authorization", authToken)
        .send({ title: "수정된 제목" });
      expect(updateResponse.status).toBe(200);

      const getUpdated = await request(app).get(`/complaints/${complaintId}`);
      expect(getUpdated.body.title).toBe("수정된 제목");

      const deleteResponse = await request(app)
        .delete(`/complaints/${complaintId}`)
        .set("Authorization", authToken);
      expect(deleteResponse.status).toBe(200);

      const confirmResponse = await request(app).get(`/complaints/${complaintId}`);
      expect(confirmResponse.status).toBe(404);
    });
  });
});
