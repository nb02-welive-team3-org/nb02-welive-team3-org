jest.doMock('../../config/data-source', () => ({
  AppDataSource: TestAppDataSource,
}));

import request from 'supertest';
import { TestAppDataSource } from '../../config/test-data-source';
import { ApprovalStatus } from '../../entities/approvalStatus.entity';
import { User } from '../../entities/user.entity';
import app from '../../app';

describe('Users API Integration (PostgreSQL)', () => {
  const VALID_PASSWORD = 'superadmin1234!';
  const NEW_PASSWORD = 'newPassword123!';
  const VALID_CONTACT_SUPER_ADMIN = '01099999999';
  const VALID_CONTACT_ADMIN = '01088888888';
  const VALID_CONTACT_RESIDENT = '01077777777';

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
    startComplexNumber: '1',
    endComplexNumber: '10',
    startDongNumber: '1',
    endDongNumber: '10',
    startFloorNumber: '1',
    endFloorNumber: '25',
    startHoNumber: '1',
    endHoNumber: '4',
  };

  const BASE_RESIDENT_CREDENTIALS = {
    username: 'resident1',
    password: VALID_PASSWORD,
    contact: VALID_CONTACT_RESIDENT,
    name: '홍길동',
    email: 'hong@example.com',
    apartmentName: '테스트아파트',
    apartmentDong: '101',
    apartmentHo: '102',
  };

  beforeAll(async () => {
    if (!TestAppDataSource.isInitialized) {
      await TestAppDataSource.initialize();
    }
  });

  afterAll(async () => {
    if (TestAppDataSource.isInitialized) {
      await TestAppDataSource.destroy();
    }
  });

  beforeEach(async () => {
    await TestAppDataSource.synchronize(true);
  });

  it('승인된 입주민이 자신의 정보를 PATCH /api/users/me로 수정할 수 있다', async () => {
    await request(app).post('/api/auth/signup/super-admin').send(BASE_SUPER_ADMIN_CREDENTIALS).expect(201);

    const superAdminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    const superAdminCookie = Array.isArray(superAdminLogin.headers['set-cookie'])
      ? superAdminLogin.headers['set-cookie']
      : [superAdminLogin.headers['set-cookie'] as string];

    const adminSignup = await request(app).post('/api/auth/signup/admin').send(BASE_ADMIN_CREDENTIALS).expect(201);
    const adminId = adminSignup.body.id;

    await request(app)
      .patch(`/api/auth/admins/${adminId}/status`)
      .set('Cookie', superAdminCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: BASE_ADMIN_CREDENTIALS.username, password: BASE_ADMIN_CREDENTIALS.password })
      .expect(200);

    const adminCookie = Array.isArray(adminLogin.headers['set-cookie'])
      ? adminLogin.headers['set-cookie']
      : [adminLogin.headers['set-cookie'] as string];

    const residentSignup = await request(app).post('/api/auth/signup').send(BASE_RESIDENT_CREDENTIALS).expect(201);
    const userId = residentSignup.body.id;

    const userRepo = TestAppDataSource.getRepository(User);
    const userBeforeApprove = await userRepo.findOne({
      where: { id: userId },
      relations: ['resident'],
    });

    const residentId = userBeforeApprove!.resident!.id;

    await request(app)
      .patch(`/api/auth/residents/${residentId}/status`)
      .set('Cookie', adminCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    const residentLogin = await request(app)
      .post('/api/auth/login')
      .send({ username: BASE_RESIDENT_CREDENTIALS.username, password: BASE_RESIDENT_CREDENTIALS.password })
      .expect(200);

    const residentCookie = Array.isArray(residentLogin.headers['set-cookie'])
      ? residentLogin.headers['set-cookie']
      : [residentLogin.headers['set-cookie'] as string];

    const patchResponse = await request(app)
      .patch('/api/users/me')
      .set('Cookie', residentCookie)
      .send({ currentPassword: VALID_PASSWORD, newPassword: NEW_PASSWORD })
      .expect(200);

    expect(patchResponse.body.message).toContain('정보가 성공적으로 업데이트되었습니다');

    await request(app)
      .post('/api/auth/login')
      .send({ username: BASE_RESIDENT_CREDENTIALS.username, password: NEW_PASSWORD })
      .expect(200);
  });
});
