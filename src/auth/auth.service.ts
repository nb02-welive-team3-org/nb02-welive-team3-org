import z from 'zod';
import {
  LoginRequestBodySchema,
  SignupAdminRequestBodySchema,
  SignupRequestBodySchema,
  SignupSuperAdminRequestBodySchema,
  UpdateAdminRequestBodySchema,
} from './auth.dto';
import { AppDataSource } from '../config/data-source';
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '../types/error.type';
import { UserRole } from '../entities/user.entity';
import { HouseholdType, Resident, ResidenceStatus } from '../entities/resident.entity';
import { comparePassword, hashPassword } from '../utils/password.util';
import { ApprovalStatus } from '../entities/approvalStatus.entity';

export const signup = async (body: z.infer<typeof SignupRequestBodySchema>) => {
  const userRepository = AppDataSource.getRepository('User');
  const apartmentRepository = AppDataSource.getRepository('Apartment');
  const residentRepository = AppDataSource.getRepository('Resident');
  const { username, password, contact, name, email, role, apartmentName, apartmentDong, apartmentHo } = body;

  const existUser = await userRepository.findOne({
    where: [{ username }, { email }, { contact }],
  });
  if (existUser) {
    throw new ConflictError('이미 사용 중인 정보(아이디, 이메일, 전화번호)입니다');
  }

  const existApartment = await apartmentRepository.findOne({
    where: { name: apartmentName },
  });
  if (!existApartment) {
    throw new InternalServerError('회원가입을 진행하는 중 오류가 발생했습니다.');
  }
  const existApartmentId = existApartment.id;

  let resident;
  let joinStatus = ApprovalStatus.PENDING;
  let isRegistered = false;
  const existResidents = await apartmentRepository.find({
    where: { residents: { building: apartmentDong, unitNumber: apartmentHo } },
    relations: { residents: true },
  });

  if (existResidents.length > 0) {
    const isMatch = existResidents.some((resident) => {
      return resident.residents.some((r: Resident) => r.name === name && r.contact === contact);
    });

    if (isMatch) {
      resident = existResidents[0].residents.find((r: Resident) => r.name === name && r.contact === contact);
      joinStatus = ApprovalStatus.APPROVED;
      isRegistered = resident.isRegistered;
      if (!isRegistered) {
        resident.isRegistered = true;
        await residentRepository.save(resident);
      }
    }
  } else {
    resident = residentRepository.create({
      building: apartmentDong,
      unitNumber: apartmentHo,
      name: name,
      contact: contact,
      apartment: existApartment,
      apartmentId: existApartmentId,
      isHouseholder: HouseholdType.HOUSEHOLDER,
      residentStatus: ResidenceStatus.RESIDENCE,
      approvalStatus: ApprovalStatus.PENDING,
      isRegistered: true,
    });
    await residentRepository.save(resident);
  }

  const residentId = resident.id;

  const hashedPassword = await hashPassword(password);

  const newUser = userRepository.create({
    username,
    password: hashedPassword,
    contact,
    name,
    email,
    apartment: existApartment,
    apartmentId: existApartmentId,
    resident,
    residentId,
    role: role || UserRole.ADMIN,
    joinStatus: joinStatus,
  });

  await userRepository.save(newUser);

  resident.user = newUser;
  await residentRepository.save(resident);

  return newUser;
};

export const signupAdmin = async (body: z.infer<typeof SignupAdminRequestBodySchema>) => {
  const userRepository = AppDataSource.getRepository('User');
  const {
    username,
    password,
    contact,
    name,
    email,
    description,
    startComplexNumber,
    endComplexNumber,
    startDongNumber,
    endDongNumber,
    startFloorNumber,
    endFloorNumber,
    startHoNumber,
    endHoNumber,
    role,
    apartmentName,
    apartmentAddress,
    apartmentManagementNumber,
  } = body;

  const existUser = await userRepository.findOne({ where: [{ username }, { email }, { contact }] });
  if (existUser) throw new ConflictError('이미 사용 중인 정보(아이디, 이메일, 전화번호)입니다');

  return await AppDataSource.transaction(async (manager) => {
    const userRepo = manager.getRepository('User');
    const aptRepo = manager.getRepository('Apartment');
    const noticeRepo = manager.getRepository('NoticeBoard');
    const complaintRepo = manager.getRepository('ComplaintBoard');
    const pollRepo = manager.getRepository('PollBoard');

    let apartment = await aptRepo.findOne({ where: { name: apartmentName } });

    if (!apartment) {
      apartment = aptRepo.create({
        name: apartmentName,
        address: apartmentAddress,
        officeNumber: apartmentManagementNumber,
        description,
        startComplexNumber,
        endComplexNumber,
        startDongNumber,
        endDongNumber,
        startFloorNumber,
        endFloorNumber,
        startHoNumber,
        endHoNumber,
      });
      await aptRepo.save(apartment);

      const newNoticeBoard = noticeRepo.create({ apartment });
      await noticeRepo.save(newNoticeBoard);
      const newComplaintBoard = complaintRepo.create({ apartment });
      await complaintRepo.save(newComplaintBoard);
      const newPollBoard = pollRepo.create({ apartment });
      await pollRepo.save(newPollBoard);

      apartment.noticeBoard = newNoticeBoard;
      apartment.complaintBoard = newComplaintBoard;
      apartment.pollBoard = newPollBoard;
      await aptRepo.save(apartment);
    }

    const hashedPassword = await hashPassword(password);

    const newAdmin = userRepo.create({
      username,
      password: hashedPassword,
      contact,
      name,
      email,
      apartment,
      apartmentId: apartment.id,
      role: role || UserRole.ADMIN,
      joinStatus: ApprovalStatus.PENDING,
      isActive: true,
    });
    await userRepo.save(newAdmin);

    apartment.adminId = newAdmin.id;
    await aptRepo.save(apartment);

    return newAdmin;
  });
};

export const signupSuperAdmin = async (body: z.infer<typeof SignupSuperAdminRequestBodySchema>) => {
  const userRepository = AppDataSource.getRepository('User');
  const { username, password, contact, name, email, role, joinStatus } = body;

  const existUser = await userRepository.findOne({
    where: [{ username }, { email }, { contact }],
  });
  if (existUser) {
    throw new ConflictError('이미 사용 중인 정보(아이디, 이메일, 전화번호)입니다');
  }

  const hashedPassword = await hashPassword(password);

  const newSuperAdmin = userRepository.create({
    username,
    password: hashedPassword,
    contact,
    name,
    email,
    role: role || UserRole.SUPER_ADMIN,
    joinStatus: joinStatus || ApprovalStatus.APPROVED,
    isActive: true,
  });

  await userRepository.save(newSuperAdmin);

  return newSuperAdmin;
};

export const login = async (body: z.infer<typeof LoginRequestBodySchema>) => {
  const userRepository = AppDataSource.getRepository('User');
  const { username, password } = body;
  const user = await userRepository.findOne({
    where: { username },
    relations: { apartment: true, resident: true },
    withDeleted: false,
  });
  if (!user) {
    throw new BadRequestError('사용자를 찾을 수 없습니다');
  }
  const isPasswordMatch = await comparePassword(password, user.password);
  if (!isPasswordMatch) {
    throw new UnauthorizedError('인증 실패(잘못된 아이디 또는 비밀번호)');
  }
  if (user.joinStatus !== ApprovalStatus.APPROVED) {
    throw new ForbiddenError('접근 권한이 없습니다(이미 로그인 상태이거나 비활성화된 계정입니다)');
  }

  user.lastLoginAt = new Date();
  await userRepository.save(user);

  return user;
};

export const addRefreshToken = async (userId: string, refreshToken: string) => {
  const userRepository = AppDataSource.getRepository('User');
  const user = await userRepository.findOne({
    where: { id: userId },
  });
  if (!user) {
    throw new NotFoundError('존재하지 않는 사용자입니다.');
  }
  user.refreshToken = refreshToken;
  await userRepository.save(user);
};

export const logout = async (userId: string) => {
  const userRepository = AppDataSource.getRepository('User');
  const existUser = await userRepository.findOne({
    where: { id: userId },
  });
  if (!existUser) {
    throw new NotFoundError('존재하지 않는 사용자입니다.');
  }
  return;
};

export const removeRefreshToken = async (userId: string) => {
  const userRepository = AppDataSource.getRepository('User');
  const user = await userRepository.findOne({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('존재하지 않는 사용자입니다.');
  }
  user.refreshToken = null;
  await userRepository.save(user);
  return;
};

export const refresh = async (userId: string, refreshToken: string) => {
  const userRepository = AppDataSource.getRepository('User');
  const user = await userRepository.findOne({
    where: { id: userId },
    relations: { apartment: true, resident: true },
  });
  if (!user) {
    throw new NotFoundError('존재하지 않는 사용자입니다.');
  }
  if (user.refreshToken !== refreshToken) {
    throw new UnauthorizedError('갱신 실패(다른 기기에서 로그인하여 토큰이 변경되었거나, 로그아웃하여 토큰이 삭제됨)');
  }

  return;
};

export const updateAdminStatus = async (adminId: string, status: ApprovalStatus) => {
  const userRepository = AppDataSource.getRepository('User');
  const apartmentRepository = AppDataSource.getRepository('Apartment');
  const admin = await userRepository.findOne({
    where: { id: adminId, role: UserRole.ADMIN },
    relations: { apartment: true },
  });
  if (!admin) {
    throw new NotFoundError('존재하지 않는 관리자입니다.');
  }

  admin.joinStatus = status;
  admin.isActive = true;
  await userRepository.save(admin);

  const apartment = admin.apartment;
  if (apartment) {
    apartment.adminId = admin.id;
    apartment.apartmentStatus = admin.joinStatus;
    await apartmentRepository.save(apartment);
  }

  return;
};

export const updateAdminsStatus = async (status: ApprovalStatus) => {
  const userRepository = AppDataSource.getRepository('User');
  const apartmentRepository = AppDataSource.getRepository('Apartment');
  const admins = await userRepository.find({
    where: { role: UserRole.ADMIN, joinStatus: ApprovalStatus.PENDING },
    relations: { apartment: true },
  });

  if (admins.length === 0) {
    throw new NotFoundError('존재하는 관리자가 없습니다.');
  }

  for (const admin of admins) {
    admin.joinStatus = status;
    admin.isActive = true;
    await userRepository.save(admin);

    const apartment = admin.apartment;
    if (apartment) {
      apartment.adminId = admin.id;
      apartment.apartmentStatus = admin.joinStatus;
      await apartmentRepository.save(apartment);
    }
  }

  return;
};

export const updateAdmin = async (adminId: string, body: z.infer<typeof UpdateAdminRequestBodySchema>) => {
  const userRepository = AppDataSource.getRepository('User');
  const apartmentRepository = AppDataSource.getRepository('Apartment');
  const { contact, email, description, apartmentName, apartmentAddress, apartmentManagementNumber } = body;

  console.log('UpdateAdmin body:', body);

  const admin = await userRepository.findOne({
    where: { id: adminId, role: UserRole.ADMIN },
    relations: { apartment: true },
  });
  if (!admin) {
    throw new NotFoundError('존재하지 않는 관리자입니다.');
  }

  if (contact) {
    const existContact = await userRepository.findOne({ where: { contact } });
    if (existContact && existContact.id !== adminId) {
      throw new ConflictError('이미 사용 중인 전화번호입니다.');
    }
    admin.contact = contact;
  }

  if (email) {
    const existEmail = await userRepository.findOne({ where: { email } });
    if (existEmail && existEmail.id !== adminId) {
      throw new ConflictError('이미 사용 중인 이메일입니다.');
    }
    admin.email = email;
  }

  if (description) {
    const apartment = admin.apartment;
    if (apartment) {
      apartment.description = description;
      await apartmentRepository.save(apartment);
    }
  }

  if (apartmentName || apartmentAddress || apartmentManagementNumber) {
    const apartment = admin.apartment;
    if (apartment) {
      if (apartmentName) apartment.name = apartmentName;
      if (apartmentAddress) apartment.address = apartmentAddress;
      if (apartmentManagementNumber) apartment.officeNumber = apartmentManagementNumber;
      await apartmentRepository.save(apartment);
    }
  }

  await userRepository.save(admin);

  return;
};

export const deleteAdmin = async (adminId: string) => {
  const userRepository = AppDataSource.getRepository('User');
  const apartmentRepository = AppDataSource.getRepository('Apartment');
  const admin = await userRepository.findOne({
    where: { id: adminId, role: UserRole.ADMIN },
    relations: { apartment: true },
  });
  if (!admin) {
    throw new NotFoundError('존재하지 않는 관리자입니다.');
  }

  const apartment = admin.apartment;
  if (apartment) {
    apartment.adminId = null;
    apartment.apartmentStatus = ApprovalStatus.PENDING;
    await apartmentRepository.save(apartment);
    await apartmentRepository.softDelete(apartment.id);
  }

  await userRepository.softDelete(admin.id);

  return;
};

export const cleanup = async (userId: string) => {
  const userRepository = AppDataSource.getRepository('User');
  const apartmentRepository = AppDataSource.getRepository('Apartment');
  const residentRepository = AppDataSource.getRepository('Resident');

  const user = await userRepository.findOne({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundError('존재하지 않는 사용자입니다.');
  }

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    throw new ForbiddenError('접근 권한이 없습니다.');
  }

  if (user.role === UserRole.SUPER_ADMIN) {
    const adminsToDelete = await userRepository.find({
      where: { role: UserRole.ADMIN, joinStatus: ApprovalStatus.REJECTED },
      withDeleted: false,
    });

    for (const admin of adminsToDelete) {
      const apartment = await apartmentRepository.findOne({
        where: { id: admin.apartmentId },
      });
      if (apartment) {
        apartment.adminId = null;
        apartment.apartmentStatus = ApprovalStatus.PENDING;
        await apartmentRepository.save(apartment);
        await apartmentRepository.softDelete(apartment.id);
      }
      await userRepository.softDelete(admin.id);
    }
  } else if (user.role === UserRole.ADMIN) {
    const residentsToDelete = await residentRepository
      .createQueryBuilder('resident')
      .innerJoinAndSelect('resident.user', 'user')
      .where('user.joinStatus = :status', { status: ApprovalStatus.REJECTED })
      .getMany();

    for (const resident of residentsToDelete) {
      await residentRepository.softDelete(resident.id);
    }
  }
};

export const updateResidentStatus = async (residentId: string, status: ApprovalStatus) => {
  const residentRepository = AppDataSource.getRepository('Resident');
  const userRepository = AppDataSource.getRepository('User');

  const resident = await residentRepository.findOne({
    where: { id: residentId },
    relations: { user: true },
  });

  if (!resident) {
    throw new NotFoundError('존재하지 않는 세대원입니다.');
  }

  if (!resident.user) {
    throw new NotFoundError('세대원에 연결된 사용자 정보가 없습니다.');
  }

  if (resident.user.joinStatus === status) {
    return;
  }

  resident.user.joinStatus = status;
  await userRepository.save(resident.user);
};

export const updateResidentsStatus = async (status: ApprovalStatus) => {
  const residentRepository = AppDataSource.getRepository('Resident');
  const userRepository = AppDataSource.getRepository('User');

  const residents = await residentRepository
    .createQueryBuilder('resident')
    .innerJoinAndSelect('resident.user', 'user')
    .where('user.joinStatus = :status', { status: ApprovalStatus.PENDING })
    .getMany();

  if (residents.length === 0) {
    throw new NotFoundError('승인 대기 중인 세대원이 없습니다.');
  }

  const updatedUsers = [];

  for (const resident of residents) {
    if (!resident.user) {
      continue;
    }

    resident.approvalStatus = status;
    resident.user.joinStatus = status;
    updatedUsers.push(userRepository.save(resident.user));
  }

  await Promise.all(updatedUsers);

  await residentRepository.save(residents);

  return;
};
