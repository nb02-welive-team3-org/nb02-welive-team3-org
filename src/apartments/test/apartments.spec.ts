jest.doMock('../../config/data-source', () => ({
  AppDataSource: TestAppDataSource,
}));

import request from 'supertest';
import { TestAppDataSource } from '../../config/test-data-source';
import { ApprovalStatus } from '../../entities/approvalStatus.entity';

import app from '../../app';

describe('Apartments API', () => {
  const VALID_PASSWORD = 'superadmin1234!';
  const VALID_CONTACT_SUPER_ADMIN = '01099999999';
  const VALID_CONTACT_ADMIN = '01088888888';

  const BASE_SUPER_ADMIN_CREDENTIALS = {
    username: 'superadmin',
    password: VALID_PASSWORD,
    contact: VALID_CONTACT_SUPER_ADMIN,
    name: '슈퍼관리자',
    email: 'super@example.com',
  };

  const BASE_ADMIN_CREDENTIALS = {
    username: 'admin',
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

  it('GET /api/apartments - 모든 아파트 목록을 조회한다', async () => {
    await request(app)
      .post('/api/auth/signup/super-admin')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
        contact: BASE_SUPER_ADMIN_CREDENTIALS.contact,
        name: BASE_SUPER_ADMIN_CREDENTIALS.name,
        email: BASE_SUPER_ADMIN_CREDENTIALS.email,
      })
      .expect(201);

    const superAdminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    const superAdminCookie = Array.isArray(superAdminLoginResponse.headers['set-cookie'])
      ? superAdminLoginResponse.headers['set-cookie']
      : [superAdminLoginResponse.headers['set-cookie'] as string];

    const adminSignupResponse = await request(app)
      .post('/api/auth/signup/admin')
      .send(BASE_ADMIN_CREDENTIALS)
      .expect(201);

    const adminId = adminSignupResponse.body.id;

    await request(app)
      .patch(`/api/auth/admins/${adminId}/status`)
      .set('Cookie', superAdminCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    const res = await request(app).get('/api/apartments').expect(200);
    expect(Array.isArray(res.body.apartments)).toBe(true);
    expect(res.body.apartments.length).toBeGreaterThan(0);
    expect(res.body.apartments[0]).toHaveProperty('name', BASE_ADMIN_CREDENTIALS.apartmentName);
    expect(res.body.apartments[0]).toHaveProperty('address', BASE_ADMIN_CREDENTIALS.apartmentAddress);
    expect(res.body.apartments[0]).toHaveProperty('adminId');
  });

  it('GET /api/apartments/:id - 특정 아파트 상세 정보를 조회한다', async () => {
    await request(app).post('/api/auth/signup/super-admin').send(BASE_SUPER_ADMIN_CREDENTIALS).expect(201);

    const superAdminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    const superAdminCookie = Array.isArray(superAdminLoginResponse.headers['set-cookie'])
      ? superAdminLoginResponse.headers['set-cookie']
      : [superAdminLoginResponse.headers['set-cookie'] as string];

    const adminSignupResponse = await request(app)
      .post('/api/auth/signup/admin')
      .send(BASE_ADMIN_CREDENTIALS)
      .expect(201);

    const adminId = adminSignupResponse.body.id;

    await request(app)
      .patch(`/api/auth/admins/${adminId}/status`)
      .set('Cookie', superAdminCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    const allAptRes = await request(app).get('/api/apartments').expect(200);
    const apartmentId = allAptRes.body.apartments[0].id;

    const res = await request(app).get(`/api/apartments/${apartmentId}`).expect(200);

    expect(res.body).toHaveProperty('id', apartmentId);
    expect(res.body).toHaveProperty('name', BASE_ADMIN_CREDENTIALS.apartmentName);
    expect(res.body).toHaveProperty('address', BASE_ADMIN_CREDENTIALS.apartmentAddress);
    expect(res.body).toHaveProperty('adminName', BASE_ADMIN_CREDENTIALS.name);
    expect(res.body).toHaveProperty('pollBoardId');
  });
});
