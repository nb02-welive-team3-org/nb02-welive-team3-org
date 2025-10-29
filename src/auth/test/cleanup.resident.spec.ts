import { TestAppDataSource } from '../../config/test-data-source';
import { UserRole } from '../../entities/user.entity';
import { ApprovalStatus } from '../../entities/approvalStatus.entity';
import { ForbiddenError } from '../../types/error.type';
import { ResidenceStatus } from '../../entities/resident.entity';

jest.mock('../../config/data-source', () => {
  return {
    AppDataSource: TestAppDataSource,
  };
});

import { cleanup } from '../auth.service';

describe('AuthService - cleanup (Resident)', () => {
  it('어드민이 거절된 입주민을 정리한다', async () => {
    const userRepo = TestAppDataSource.getRepository('User');
    const residentRepo = TestAppDataSource.getRepository('Resident');
    const aptRepo = TestAppDataSource.getRepository('Apartment');

    const apartment = await aptRepo.save({
      name: '관리아파트',
      address: '서울시 송파구',
      officeNumber: '02-2222-3333',
      description: '관리자 아파트입니다.',
      startComplexNumber: '1',
      endComplexNumber: '1',
      startDongNumber: '101',
      endDongNumber: '102',
      startFloorNumber: '1',
      endFloorNumber: '10',
      startHoNumber: '101',
      endHoNumber: '1101',
    });

    const admin = await userRepo.save({
      username: 'admin1',
      password: 'adminpass',
      contact: '01022223333',
      name: '관리자',
      email: 'admin@test.com',
      role: UserRole.ADMIN,
      joinStatus: ApprovalStatus.APPROVED,
      apartment: apartment,
    });

    const resident = await residentRepo.save({
      name: 'r1',
      contact: '010',
      building: '101',
      unitNumber: '101',
      apartment: apartment,
      residenceStatus: ResidenceStatus.RESIDENCE,
    });

    const rejectedUser = await userRepo.save({
      username: 'rejectuser',
      password: 'rejectpass',
      contact: '010',
      name: 'r1',
      email: 'reject@test.com',
      role: UserRole.USER,
      joinStatus: ApprovalStatus.REJECTED,
      apartment: apartment,
      resident: resident,
    });

    resident.user = rejectedUser;
    await residentRepo.save(resident);

    await cleanup(admin.id);

    const deleted = await residentRepo.findOne({ where: { id: resident.id }, withDeleted: true });
    expect(deleted).toBeDefined();
    expect(deleted?.deletedAt).not.toBeNull();
  });

  it('권한 없는 유저가 실행 시 ForbiddenError 발생', async () => {
    const userRepo = TestAppDataSource.getRepository('User');
    const residentRepo = TestAppDataSource.getRepository('Resident');
    const aptRepo = TestAppDataSource.getRepository('Apartment');

    const apartment = await aptRepo.save({
      name: '테스트아파트',
      address: '서울시',
      officeNumber: '02-1111-1111',
      description: '테스트',
      startComplexNumber: '1',
      endComplexNumber: '1',
      startDongNumber: '101',
      endDongNumber: '101',
      startFloorNumber: '1',
      endFloorNumber: '1',
      startHoNumber: '101',
      endHoNumber: '101',
    });

    const resident = await residentRepo.save({
      name: '홍길동',
      contact: '01011112222',
      building: '101',
      unitNumber: '101',
      apartment: apartment,
      residenceStatus: ResidenceStatus.RESIDENCE,
    });

    const normal = await userRepo.save({
      username: 'user1',
      password: 'pass1234',
      contact: '01011112222',
      name: '홍길동',
      email: 'user1@test.com',
      role: UserRole.USER,
      joinStatus: ApprovalStatus.APPROVED,
      apartment: apartment,
      resident: resident,
    });

    resident.user = normal;
    await residentRepo.save(resident);

    await expect(cleanup(normal.id)).rejects.toThrow(ForbiddenError);
  });
});
