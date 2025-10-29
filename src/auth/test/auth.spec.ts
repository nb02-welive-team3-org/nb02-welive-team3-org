jest.doMock('../../config/data-source', () => ({
  AppDataSource: TestAppDataSource,
}));

import request from 'supertest';
import { TestAppDataSource } from '../../config/test-data-source';
import { ApprovalStatus } from '../../entities/approvalStatus.entity';
import { UserRole } from '../../entities/user.entity';

import app from '../../app';

describe('Auth API Integration (PostgreSQL)', () => {
  let superAdminCookie: string[];
  let adminCookie: string[];
  let residentCookie: string[];
  let adminId: string;
  let residentId: string;

  const VALID_PASSWORD = 'superadmin1234!';
  const VALID_CONTACT_SUPER_ADMIN = '01099999999';
  const VALID_CONTACT_ADMIIN = '01088888888';
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
    contact: VALID_CONTACT_ADMIIN,
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
  const BASE_USER_CREDENTIALS = {
    username: 'resident1',
    password: VALID_PASSWORD,
    contact: VALID_CONTACT_RESIDENT,
    name: '홍길동',
    email: 'hong@example.com',
    apartmentName: '테스트아파트',
    apartmentDong: '101',
    apartmentHo: '102',
  };

  beforeEach(async () => {
    if (!TestAppDataSource.isInitialized) {
      await TestAppDataSource.initialize();
    }
    await TestAppDataSource.synchronize(true);
  });

  beforeAll(async () => {
    if (!TestAppDataSource.isInitialized) {
      await TestAppDataSource.initialize();
    }
    await TestAppDataSource.synchronize(true);
  });

  afterAll(async () => {
    if (TestAppDataSource.isInitialized) {
      await TestAppDataSource.destroy();
    }
  });

  it('POST /api/auth/signup/super-admin', async () => {
    const res = await request(app)
      .post('/api/auth/signup/super-admin')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
        contact: BASE_SUPER_ADMIN_CREDENTIALS.contact,
        name: BASE_SUPER_ADMIN_CREDENTIALS.name,
        email: BASE_SUPER_ADMIN_CREDENTIALS.email,
      })
      .expect(201);
    expect(res.body.role).toBe(UserRole.SUPER_ADMIN);
  });

  it('POST /api/auth/signup + login - super admin full flow', async () => {
    const signupRes = await request(app)
      .post('/api/auth/signup/super-admin')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
        contact: BASE_SUPER_ADMIN_CREDENTIALS.contact,
        name: BASE_SUPER_ADMIN_CREDENTIALS.name,
        email: BASE_SUPER_ADMIN_CREDENTIALS.email,
      })
      .expect(201);

    expect(signupRes.body.role).toBe(UserRole.SUPER_ADMIN);

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

    expect(superAdminCookie.length).toBeGreaterThan(0);
  });

  it('POST /api/auth/signup/admin', async () => {
    const res = await request(app).post('/api/auth/signup/admin').send(BASE_ADMIN_CREDENTIALS).expect(201);
    adminId = res.body.id;
    expect(res.body.role).toBe(UserRole.ADMIN);
  });

  it('POST /api/auth/signup + login (Pending) - admin flow', async () => {
    const signupRes = await request(app).post('/api/auth/signup/admin').send(BASE_ADMIN_CREDENTIALS).expect(201);

    adminId = signupRes.body.id;
    expect(signupRes.body.role).toBe(UserRole.ADMIN);

    await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_ADMIN_CREDENTIALS.username,
        password: BASE_ADMIN_CREDENTIALS.password,
      })
      .expect(403);
  });

  it('POST /api/auth/signup + approve - admin full flow', async () => {
    const superAdminSignupResponse = await request(app)
      .post('/api/auth/signup/super-admin')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
        contact: BASE_SUPER_ADMIN_CREDENTIALS.contact,
        name: BASE_SUPER_ADMIN_CREDENTIALS.name,
        email: BASE_SUPER_ADMIN_CREDENTIALS.email,
      })
      .expect(201);

    expect(superAdminSignupResponse.body.role).toBe(UserRole.SUPER_ADMIN);

    const superAdminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    const superAdminLoginCookie = Array.isArray(superAdminLoginResponse.headers['set-cookie'])
      ? superAdminLoginResponse.headers['set-cookie']
      : [superAdminLoginResponse.headers['set-cookie'] as string];

    const adminSignupResponse = await request(app)
      .post('/api/auth/signup/admin')
      .send(BASE_ADMIN_CREDENTIALS)
      .expect(201);

    const createdAdminId = adminSignupResponse.body.id;
    expect(adminSignupResponse.body.role).toBe(UserRole.ADMIN);

    await request(app)
      .patch(`/api/auth/admins/${createdAdminId}/status`)
      .set('Cookie', superAdminLoginCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);
  });

  it('POST /api/auth/login - admin login (Approved)', async () => {
    const superAdminSignupResponse = await request(app)
      .post('/api/auth/signup/super-admin')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
        contact: BASE_SUPER_ADMIN_CREDENTIALS.contact,
        name: BASE_SUPER_ADMIN_CREDENTIALS.name,
        email: BASE_SUPER_ADMIN_CREDENTIALS.email,
      })
      .expect(201);

    expect(superAdminSignupResponse.body.role).toBe(UserRole.SUPER_ADMIN);

    const superAdminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    const superAdminLoginCookie = Array.isArray(superAdminLoginResponse.headers['set-cookie'])
      ? superAdminLoginResponse.headers['set-cookie']
      : [superAdminLoginResponse.headers['set-cookie'] as string];

    const adminSignupResponse = await request(app)
      .post('/api/auth/signup/admin')
      .send(BASE_ADMIN_CREDENTIALS)
      .expect(201);

    const createdAdminId = adminSignupResponse.body.id;
    expect(adminSignupResponse.body.role).toBe(UserRole.ADMIN);

    await request(app)
      .patch(`/api/auth/admins/${createdAdminId}/status`)
      .set('Cookie', superAdminLoginCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: BASE_ADMIN_CREDENTIALS.username, password: BASE_ADMIN_CREDENTIALS.password })
      .expect(200);

    adminCookie = Array.isArray(res.headers['set-cookie'])
      ? res.headers['set-cookie']
      : [res.headers['set-cookie'] as string];
  });

  it('POST /api/auth/signup + approve - super-admin + admin flow', async () => {
    const superAdminSignupResponse = await request(app)
      .post('/api/auth/signup/super-admin')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
        contact: BASE_SUPER_ADMIN_CREDENTIALS.contact,
        name: BASE_SUPER_ADMIN_CREDENTIALS.name,
        email: BASE_SUPER_ADMIN_CREDENTIALS.email,
      })
      .expect(201);

    expect(superAdminSignupResponse.body.role).toBe(UserRole.SUPER_ADMIN);
    const superAdminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    superAdminCookie = Array.isArray(superAdminLoginResponse.headers['set-cookie'])
      ? superAdminLoginResponse.headers['set-cookie']
      : [superAdminLoginResponse.headers['set-cookie'] as string];

    const adminSignupResponse = await request(app)
      .post('/api/auth/signup/admin')
      .send(BASE_ADMIN_CREDENTIALS)
      .expect(201);

    const createdAdminId = adminSignupResponse.body.id;

    await request(app)
      .patch(`/api/auth/admins/${createdAdminId}/status`)
      .set('Cookie', superAdminCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_ADMIN_CREDENTIALS.username,
        password: BASE_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    adminCookie = Array.isArray(adminLoginResponse.headers['set-cookie'])
      ? adminLoginResponse.headers['set-cookie']
      : [adminLoginResponse.headers['set-cookie'] as string];
  });

  it('POST /api/auth/signup - resident signup (Pending)', async () => {
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

    const createdAdminId = adminSignupResponse.body.id;

    await request(app)
      .patch(`/api/auth/admins/${createdAdminId}/status`)
      .set('Cookie', superAdminCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_ADMIN_CREDENTIALS.username,
        password: BASE_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    const residentSignupResponse = await request(app).post('/api/auth/signup').send(BASE_USER_CREDENTIALS).expect(201);

    residentId = residentSignupResponse.body.id;
    expect(residentSignupResponse.body.role).toBe(UserRole.USER);
  });

  it('POST /api/auth/login - resident login (Pending)', async () => {
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

    const createdAdminId = adminSignupResponse.body.id;

    await request(app)
      .patch(`/api/auth/admins/${createdAdminId}/status`)
      .set('Cookie', superAdminCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_ADMIN_CREDENTIALS.username,
        password: BASE_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    await request(app).post('/api/auth/signup').send(BASE_USER_CREDENTIALS).expect(201);

    await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_USER_CREDENTIALS.username,
        password: BASE_USER_CREDENTIALS.password,
      })
      .expect(403);
  });

  it('PATCH /api/auth/residents/:id/status + login - approve resident', async () => {
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

    const createdAdminId = adminSignupResponse.body.id;

    await request(app)
      .patch(`/api/auth/admins/${createdAdminId}/status`)
      .set('Cookie', superAdminCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_ADMIN_CREDENTIALS.username,
        password: BASE_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    const adminCookie = Array.isArray(adminLoginResponse.headers['set-cookie'])
      ? adminLoginResponse.headers['set-cookie']
      : [adminLoginResponse.headers['set-cookie'] as string];

    const residentSignupResponse = await request(app).post('/api/auth/signup').send(BASE_USER_CREDENTIALS).expect(201);

    const createdUserId = residentSignupResponse.body.id;

    const userRepo = TestAppDataSource.getRepository('User');
    const user = await userRepo.findOne({
      where: { id: createdUserId },
      relations: { resident: true },
    });

    expect(user).toBeDefined();
    expect(user?.resident).toBeDefined();

    const createdResidentId = user!.resident!.id;

    await request(app)
      .patch(`/api/auth/residents/${createdResidentId}/status`)
      .set('Cookie', adminCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    const residentLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_USER_CREDENTIALS.username,
        password: BASE_USER_CREDENTIALS.password,
      })
      .expect(200);

    residentCookie = Array.isArray(residentLoginResponse.headers['set-cookie'])
      ? residentLoginResponse.headers['set-cookie']
      : [residentLoginResponse.headers['set-cookie'] as string];
  });

  it('POST /api/auth/refresh - super-admin refresh token', async () => {
    const superAdminSignupResponse = await request(app)
      .post('/api/auth/signup/super-admin')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
        contact: BASE_SUPER_ADMIN_CREDENTIALS.contact,
        name: BASE_SUPER_ADMIN_CREDENTIALS.name,
        email: BASE_SUPER_ADMIN_CREDENTIALS.email,
      })
      .expect(201);

    expect(superAdminSignupResponse.body.role).toBe(UserRole.SUPER_ADMIN);

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

    await request(app).post('/api/auth/refresh').set('Cookie', superAdminCookie).expect(200);
  });

  it('POST /api/auth/logout - super-admin logout', async () => {
    const superAdminSignupResponse = await request(app)
      .post('/api/auth/signup/super-admin')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
        contact: BASE_SUPER_ADMIN_CREDENTIALS.contact,
        name: BASE_SUPER_ADMIN_CREDENTIALS.name,
        email: BASE_SUPER_ADMIN_CREDENTIALS.email,
      })
      .expect(201);

    expect(superAdminSignupResponse.body.role).toBe(UserRole.SUPER_ADMIN);

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

    await request(app).post('/api/auth/logout').set('Cookie', superAdminCookie).expect(204);
  });

  it('PATCH /api/auth/admins/status - approve all admins', async () => {
    const superAdminSignupResponse = await request(app)
      .post('/api/auth/signup/super-admin')
      .send({
        username: BASE_SUPER_ADMIN_CREDENTIALS.username,
        password: BASE_SUPER_ADMIN_CREDENTIALS.password,
        contact: BASE_SUPER_ADMIN_CREDENTIALS.contact,
        name: BASE_SUPER_ADMIN_CREDENTIALS.name,
        email: BASE_SUPER_ADMIN_CREDENTIALS.email,
      })
      .expect(201);

    expect(superAdminSignupResponse.body.role).toBe(UserRole.SUPER_ADMIN);

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

    expect(adminSignupResponse.body.role).toBe(UserRole.ADMIN);

    const res = await request(app)
      .patch('/api/auth/admins/status')
      .set('Cookie', superAdminCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    expect(res.body.message).toContain('성공');
  });

  it('PATCH /api/auth/residents/status - reject all residents', async () => {
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

    const createdAdminId = adminSignupResponse.body.id;

    await request(app)
      .patch(`/api/auth/admins/${createdAdminId}/status`)
      .set('Cookie', superAdminCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_ADMIN_CREDENTIALS.username,
        password: BASE_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    const adminCookie = Array.isArray(adminLoginResponse.headers['set-cookie'])
      ? adminLoginResponse.headers['set-cookie']
      : [adminLoginResponse.headers['set-cookie'] as string];

    const residentSignupResponse = await request(app).post('/api/auth/signup').send(BASE_USER_CREDENTIALS).expect(201);

    expect(residentSignupResponse.body.role).toBe(UserRole.USER);

    const res = await request(app)
      .patch('/api/auth/residents/status')
      .set('Cookie', adminCookie)
      .send({ status: ApprovalStatus.REJECTED })
      .expect(200);

    expect(res.body.message).toContain('성공');
  });

  it('PATCH /api/auth/admins/:id - update admin info', async () => {
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

    const createdAdminId = adminSignupResponse.body.id;

    const res = await request(app)
      .patch(`/api/auth/admins/${createdAdminId}`)
      .set('Cookie', superAdminCookie)
      .send({
        contact: '01077778888',
        email: 'updatedadmin@example.com',
        description: '테스트 아파트 관리자',
        apartmentName: '수정된아파트',
      })
      .expect(200);

    expect(res.body.message).toContain('성공');
  });

  it('DELETE /api/auth/admins/:id', async () => {
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

    const createdAdminId = adminSignupResponse.body.id;

    const res = await request(app)
      .delete(`/api/auth/admins/${createdAdminId}`)
      .set('Cookie', superAdminCookie)
      .expect(200);

    expect(res.body.message).toContain('성공');
  });

  it('POST /api/auth/cleanup', async () => {
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

    const createdAdminId = adminSignupResponse.body.id;

    await request(app)
      .patch(`/api/auth/admins/${createdAdminId}/status`)
      .set('Cookie', superAdminCookie)
      .send({ status: ApprovalStatus.APPROVED })
      .expect(200);

    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: BASE_ADMIN_CREDENTIALS.username,
        password: BASE_ADMIN_CREDENTIALS.password,
      })
      .expect(200);

    const adminCookie = Array.isArray(adminLoginResponse.headers['set-cookie'])
      ? adminLoginResponse.headers['set-cookie']
      : [adminLoginResponse.headers['set-cookie'] as string];

    await request(app).post('/api/auth/cleanup').set('Cookie', adminCookie).expect(200);
  });
});
