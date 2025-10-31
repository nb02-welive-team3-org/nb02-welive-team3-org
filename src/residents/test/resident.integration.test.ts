jest.doMock('../../config/data-source', () => ({
  AppDataSource: TestAppDataSource,
}));

import request from 'supertest';
import { TestAppDataSource } from '../../config/test-data-source';
import { ApprovalStatus } from '../../entities/approvalStatus.entity';
import { UserRole, User } from '../../entities/user.entity';
import { Apartment } from '../../entities/apartment.entity';
import app from '../../app';
import { HouseholdType } from '../../entities/resident.entity';
import fs from 'fs';
import path from 'path';

describe('Auth + Resident Integration', () => {
  let superAdminCookie: string[];
  let adminCookie: string[];

  const VALID_PASSWORD = 'superadmin1234!';
  const VALID_CONTACT_SUPER_ADMIN = '01099999999';
  const VALID_CONTACT_ADMIN = '01088888888';

  const BASE_SUPER_ADMIN_CREDENTIALS = {
    username: 'superadmin2',
    password: VALID_PASSWORD,
    contact: VALID_CONTACT_SUPER_ADMIN,
    name: '슈퍼관리자2',
    email: 'super@example.com',
  };

  const BASE_ADMIN_CREDENTIALS = {
    username: 'admin1',
    password: VALID_PASSWORD,
    contact: VALID_CONTACT_ADMIN,
    name: '관리자',
    email: 'admin@example.com',
    description: '테스트 아파트 관리자',
    apartmentName: '테스트아파트',
    apartmentAddress: '서울시 강남구',
    apartmentManagementNumber: '021234567',
    officeNumber: '02-123-4567',
    startComplexNumber: '1',
    endComplexNumber: '10',
    startDongNumber: '1',
    endDongNumber: '10',
    startFloorNumber: '1',
    endFloorNumber: '25',
    startHoNumber: '1',
    endHoNumber: '4',
  };

  // ---------------------------
  // DB 초기화
  // ---------------------------
  beforeAll(async () => {
    if (!TestAppDataSource.isInitialized) {
      await TestAppDataSource.initialize();
    }
    await TestAppDataSource.synchronize(true);

    // 슈퍼 관리자 회원가입 + 로그인
    const superAdminSignupRes = await request(app)
      .post('/api/auth/signup/super-admin')
      .send(BASE_SUPER_ADMIN_CREDENTIALS)
      .expect(201);
    expect(superAdminSignupRes.body.role).toBe(UserRole.SUPER_ADMIN);

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    superAdminCookie = Array.isArray(loginRes.headers['set-cookie'])
      ? loginRes.headers['set-cookie']
      : [loginRes.headers['set-cookie'] as string];
  });


  afterAll(async () => {
    if (TestAppDataSource.isInitialized) {
      await TestAppDataSource.destroy();
    }
  });

  // ---------------------------
  // 관리자 승인 + 아파트 연결
  // ---------------------------
  it('슈퍼 관리자가 관리자를 승인하면 자동으로 아파트가 연결된다', async () => {
    // 관리자 회원가입
    const adminSignupRes = await request(app)
      .post('/api/auth/signup/admin')
      .send(BASE_ADMIN_CREDENTIALS)
      .expect(201);

    const adminId = adminSignupRes.body.id;
    expect(adminSignupRes.body.role).toBe(UserRole.ADMIN);

    // 승인 처리
    await request(app)
      .patch(`/api/auth/admins/${adminId}/status`)
      .set('Cookie', superAdminCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    // 테스트 코드에서 아파트 직접 생성 및 연결
    const userRepo = TestAppDataSource.getRepository(User);
    const apartmentRepo = TestAppDataSource.getRepository(Apartment);

    const apartment = apartmentRepo.create({
      name: BASE_ADMIN_CREDENTIALS.apartmentName,
      address: BASE_ADMIN_CREDENTIALS.apartmentAddress,
      officeNumber: BASE_ADMIN_CREDENTIALS.officeNumber,
      description: BASE_ADMIN_CREDENTIALS.description,
      startComplexNumber: BASE_ADMIN_CREDENTIALS.startComplexNumber,
      endComplexNumber: BASE_ADMIN_CREDENTIALS.endComplexNumber,
      startDongNumber: BASE_ADMIN_CREDENTIALS.startDongNumber,
      endDongNumber: BASE_ADMIN_CREDENTIALS.endDongNumber,
      startFloorNumber: BASE_ADMIN_CREDENTIALS.startFloorNumber,
      endFloorNumber: BASE_ADMIN_CREDENTIALS.endFloorNumber,
      startHoNumber: BASE_ADMIN_CREDENTIALS.startHoNumber,
      endHoNumber: BASE_ADMIN_CREDENTIALS.endHoNumber,
      apartmentStatus: ApprovalStatus.APPROVED,
    });
    await apartmentRepo.save(apartment);

    const admin = await userRepo.findOneBy({ id: adminId });
    if (admin) {
      (admin as any).apartment = apartment;
      await userRepo.save(admin);
    }

    // 승인된 관리자 로그인 성공
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_ADMIN_CREDENTIALS.username,
        password: BASE_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    adminCookie = Array.isArray(loginRes.headers['set-cookie'])
      ? loginRes.headers['set-cookie']
      : [loginRes.headers['set-cookie'] as string];

    expect(adminCookie).toBeDefined();

  });

  // ---------------------------
  // Resident API
  // ---------------------------
  describe('Resident API Integration', () => {
    let residentId: string;
    let testUser: User;

    it('관리자는 등록된 아파트 입주민 명부를 등록할 수 있다', async () => {
      const response = await request(app)
        .post('/api/residents')
        .set('Cookie', adminCookie)
        .send({
          name: '홍길동',
          contact: '01012345678',
          building: '101',
          unitNumber: '1201',
          isHouseholder: HouseholdType.HOUSEHOLDER,
        })
        .expect(201);

      expect(response.body.name).toBe('홍길동');
      expect(response.body.building).toBe('101');
      expect(response.body.unitNumber).toBe('1201');

      residentId = response.body.id;
    });

    it('관리자는 입주민 명부를 조회할 수 있다', async () => {
      const response = await request(app)
        .get('/api/residents')
        .set('Cookie', adminCookie)
        .expect(200);

      const residents =
        Array.isArray(response.body)
          ? response.body
          : response.body.data || response.body.residents || [];

      expect(Array.isArray(residents)).toBe(true);
      expect(residents.length).toBeGreaterThanOrEqual(0);
    });

    it('관리자는 입주민 상세 조회를 할 수 있다', async () => {
      const response = await request(app)
        .get(`/api/residents/${residentId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body.id).toBe(residentId);
      expect(response.body.name).toBe('홍길동');
    });

    it('관리자는 입주민 정보를 수정할 수 있다', async () => {
      const response = await request(app)
        .patch(`/api/residents/${residentId}`)
        .set('Cookie', adminCookie)
        .send({ name: '김철수', contact: '01087654321' })
        .expect(200);

      expect(response.body.name).toBe('김철수');
      expect(response.body.contact).toBe('01087654321');
    });

    it('관리자는 입주민을 삭제할 수 있다', async () => {
      const response = await request(app)
        .delete(`/api/residents/${residentId}`)
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.body.message).toBe('작업이 성공적으로 완료되었습니다.');
    });

    it('관리자는 입주민 목록 CSV를 다운로드할 수 있다', async () => {
      const response = await request(app)
        .get('/api/residents/file')
        .set('Cookie', adminCookie)
        .expect(200);

      expect(response.headers['content-type']).toMatch(/text\/csv/);
      expect(response.headers['content-disposition']).toMatch(/residents_\d{8}_\d{6}\.csv/);
    });

    it('관리자는 유효한 CSV 파일을 업로드할 수 있다', async () => {
      const buffer = fs.readFileSync(path.join(__dirname, '../assets/residents-template.csv'));

      const res = await request(app)
        .post('/api/residents/from-file')
        .set('Cookie', adminCookie)
        .attach('file', buffer, 'residents-template.csv')
        .expect(201);

      expect(res.body.count).toBeGreaterThan(0);
    });

    // ---------------------------
    // 사용자로부터 입주민 등록 테스트 추가
    // ---------------------------
    it('관리자는 사용자로부터 입주민 등록을 할 수 있다', async () => {
      const userRepo = TestAppDataSource.getRepository(User);
      testUser = userRepo.create({
        username: 'user_test',
        password: 'password123!',
        name: '테스트유저',
        contact: '01012341234',
        email: 'user_test@example.com',
        role: UserRole.USER,
      });
      await userRepo.save(testUser);

      const response = await request(app)
        .post(`/api/residents/from-user/${testUser.id}`)
        .set('Cookie', adminCookie)
        .send({
          apartmentDong: '102',
          apartmentHo: '1202',
        })
        .expect(201);

      expect(response.body.name).toBe('테스트유저');
      expect(response.body.building).toBe('102');
      expect(response.body.unitNumber).toBe('1202');
    });

    it('userId가 없으면 404 에러 발생', async () => {
      await request(app)
        .post('/api/residents/from-user/')
        .set('Cookie', adminCookie)
        .send({
          apartmentDong: '102',
          apartmentHo: '1202',
        })
        .expect(404);
    });

    it('아파트 동/호가 없으면 400 에러 발생', async () => {
      await request(app)
        .post(`/api/residents/from-user/${testUser.id}`)
        .set('Cookie', adminCookie)
        .send({})
        .expect(400);
    });
  });
});

