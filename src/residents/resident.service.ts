import { AppDataSource } from '../config/data-source';
import { CreateResidentDto, ResidentResponseDto } from './dtos/create-resident.dto';
import { Resident, HouseholdType, ResidenceStatus } from '../entities/resident.entity';
import { User } from '../entities/user.entity';
import { BadRequestError, ConflictError, NotFoundError } from '../types/error.type';
import { Apartment } from '../entities/apartment.entity';
import { parseCsvBuffer } from './utils/resident-csv.util';
import { GetResidentListParams } from './dtos/resident-filter.dto';
import { UpdatedResidentDto, updatedResidentSchema } from './dtos/update-resident.dto';
import { CsvResidentDto, csvResidentSchema } from './dtos/resident-csv.dto';
import { residentResponse } from './utils/resident.util';

/**
 * 개별 등록용
 * 
 * 관리자가 수동으로 입주민 등록 
 */
export const createResident = async (
  dto: CreateResidentDto,
  apartment: Apartment
): Promise<ResidentResponseDto> => {
  const residentRepository = AppDataSource.getRepository(Resident);

  const existingResident = await residentRepository.findOne({
    where: {
      building: dto.building,
      unitNumber: dto.unitNumber,
      name: dto.name,
      apartment: { id: apartment.id },
    },
  });

  if (existingResident) {
    throw new ConflictError('이미 등록된 입주민입니다.');
  }

  const resident = residentRepository.create({
    ...dto,
    apartment,
  });

  const saved = await residentRepository.save(resident);

  const fullResident = await residentRepository.findOne({
    where: { id: saved.id },
    relations: ['user'],
  });

  if (!fullResident) {
    throw new NotFoundError('입주민 정보 조회에 실패했습니다.');
  }

  return residentResponse(fullResident);
};

/**
 * 사용자로부터 입주민 리소스 생성
 */
export const createResidentFromUser = async (
  user: User,
  apartmentDong: string,
  apartmentHo: string,
  apartment: Apartment
): Promise<ResidentResponseDto> => {
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const residentRepository = queryRunner.manager.getRepository(Resident);

    const existingResident = await residentRepository.findOne({
      where: {
        name: user.name,
        building: apartmentDong,
        unitNumber: apartmentHo,
        apartment: { id: apartment.id },
      },
      relations: ['user'],
    });

    let savedResident: Resident;

    if (existingResident) { // 기존 입주민이 있을 경우 유저 정보만 연결
      existingResident.user = user;
      existingResident.isRegistered = true;
      savedResident = await residentRepository.save(existingResident);
    } else {
      const newResident = residentRepository.create({
        name: user.name,
        contact: user.contact,
        building: apartmentDong,
        unitNumber: apartmentHo,
        isHouseholder: HouseholdType.HOUSEHOLDER,
        residenceStatus: ResidenceStatus.RESIDENCE,
        isRegistered: true,
        user,
        apartment,
      });
      savedResident = await residentRepository.save(newResident);
    }

    await queryRunner.commitTransaction();

    return residentResponse(savedResident);

  } catch (error: unknown) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    // 연결 종료
    await queryRunner.release();
  }
};

/**
 *  입주민 명부 csv 파일 업로드
 * 
 * csv 파싱 -> 유효성 검사 -> 중복 검사 => 유효한 데이터만 DB에 일괄 삽입
 */

export const registerResidentsFromCsv = async (
  buffer: Buffer,
  apartment: Apartment
): Promise<{ count: number }> => {
  // CSV 파싱 -> 배열로 변환
  const parsedRows: CsvResidentDto[] = await parseCsvBuffer(buffer);

  const repository = AppDataSource.getRepository(Resident);

  // 유효성 검사
  const validRows: CsvResidentDto[] = [];
  const invalidRows: { row: number; errors: string }[] = [];

  parsedRows.forEach((row, index) => {
    const result = csvResidentSchema.safeParse(row);
    if (result.success) {
      validRows.push(result.data);
    } else {
      invalidRows.push({ row: index + 1, errors: result.error.message });
    }
  });

  if (invalidRows.length > 0) {
    const errorMessages = invalidRows.map(r => `Row ${r.row}: ${r.errors}`).join('; ');
    throw new ConflictError(`CSV 파일에 유효하지 않은 데이터가 포함되어 있습니다. ${errorMessages}`);
  }

  const existingResidents = await repository.find({
    where: validRows.map(row => ({
      building: row.building,
      unitNumber: row.unitNumber,
      name: row.name,
      apartment: { id: apartment.id },
    })),
  });

  // 조회된 기존 입주민을 Set으로 변환
  const existingSet = new Set(
    existingResidents.map(resident =>
      `${resident.building}-${resident.unitNumber}-${resident.name}`
    )
  );

  // 중복되지 않은 입주민만 데이터베이스에 저장
  const insertRows = validRows
    .filter(row => !existingSet.has(`${row.building}-${row.unitNumber}-${row.name}`))
    .map(row => ({
      ...row,
      apartmentId: apartment.id,
      isRegistered: false,
      residenceStatus: ResidenceStatus.RESIDENCE,
    }));

  // 단일 트랜잭션으로 일괄 삽입
  if (insertRows.length > 0) {
    await repository
      .createQueryBuilder()
      .insert()
      .values(insertRows)
      .execute();
  } else {
    throw new ConflictError('이미 등록된 입주민입니다.');
  }

  return { count: insertRows.length };
};

/**
 * 입주민 목록 조회
 */
export const getResidentList = async (params: GetResidentListParams) => {
  const repository = AppDataSource.getRepository(Resident);

  const query = repository
    .createQueryBuilder('resident')
    .where('resident.apartmentId = :apartmentId', { apartmentId: params.apartmentId });

  // 조건이 있을 경우 동적 필터링 추가
  if (params.building) {
    query.andWhere('resident.building = :building', { building: params.building });
  }
  if (params.unitNumber) {
    query.andWhere('resident.unitNumber = :unitNumber', { unitNumber: params.unitNumber });
  }
  if (params.residenceStatus) {
    query.andWhere('resident.residenceStatus = :residenceStatus', { residenceStatus: params.residenceStatus });
  }
  if (typeof params.isRegistered === 'boolean') {
    query.andWhere('resident.isRegistered = :isRegistered', {
      isRegistered: params.isRegistered,
    });
  }
  if (params.name) { // 이름 검색
    query.andWhere('resident.name LIKE :name', { name: `%${params.name}%` });
  }
  if (params.contact) { //연락처 검색
    query.andWhere('resident.contact LIKE :contact', { contact: `%${params.contact}%` });
  }

  // 결과 조회 및 정렬
  const residents = await query
    .leftJoinAndSelect('resident.user', 'user')
    .orderBy('resident.building', 'ASC')
    .addOrderBy('resident.unitNumber', 'ASC')
    .addOrderBy('resident.isHouseholder', 'DESC')
    .getMany();

  return {
    residents: residents.map(residentResponse),
  };
}

/**
 * 입주민 목록 파일 다운로드
 */

export const residentListCsv = async (apartmentId: string): Promise<string> => {
  const repository = AppDataSource.getRepository(Resident);

  const residents = await repository.find({
    where: { apartment: { id: apartmentId } },
    order: {
      building: 'ASC',
      unitNumber: 'ASC',
    }
  });

  const header = `"동","호수","이름","연락처","세대주 여부"`;
  const rows = residents.map(resident => {
    const householder = resident.isHouseholder ? "HOUSEHOLDER" : "MEMBER";
    const safeContact = resident.contact ? `=""${resident.contact}""` : '';
    return `"${resident.building}","${resident.unitNumber}","${resident.name}","${safeContact}","${householder}"`;
  });

  return '\uFEFF' + [header, ...rows].join('\n');
};

/**
 * 입주민 상세 조회
 */
export const residentListDetail = async (
  residentId: string,
  apartmentId: string
): Promise<ResidentResponseDto> => {
  const repository = AppDataSource.getRepository(Resident);

  const resident = await repository.findOne({
    where: {
      id: residentId,
      apartment: { id: apartmentId },
    },
    relations: ['user'],
  });

  if (!resident) {
    throw new NotFoundError('입주민 정보를 찾을 수 없습니다.');
  }

  return residentResponse(resident);
};

/**
 * 입주민 정보 수정
 */

export const updateResident = async (
  residentId: string,
  apartmentId: string,
  updateData: Partial<UpdatedResidentDto>
) => {
  const repository = AppDataSource.getRepository(Resident);

  // 유효성 검사
  const resident = await repository.findOne({
    where: {
      id: residentId,
      apartment: { id: apartmentId }, // 본인 아파트
    },
    relations: ['user'],
  });

  if (!resident) {
    throw new NotFoundError('입주민 정보를 찾을 수 없습니다.');
  }

  const parsed = updatedResidentSchema.safeParse(updateData);
  if (!parsed.success) {
    throw new BadRequestError(`입력값이 유효하지 않습니다: ${parsed.error.message}`);
  }

  Object.assign(resident, parsed.data);

  const updated = await repository.save(resident);

  return residentResponse(updated);
}

/**
 * 입주민 삭제
 */
export const deleteResident = async (
  residentId: string,
  apartmentId: string,
) => {
  const queryRunner = AppDataSource.createQueryRunner();

  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const residentRepository = queryRunner.manager.getRepository(Resident);
    const userRepository = queryRunner.manager.getRepository(User);

    const resident = await residentRepository.findOne({
      where: {
        id: residentId,
        apartment: { id: apartmentId },
      },
      relations: ['user'],
    });

    if (!resident) {
      throw new NotFoundError('입주민 정보를 찾을 수 없습니다.');
    }

    if (resident.user) {
      await userRepository.softRemove(resident.user);
    }

    await residentRepository.softRemove(resident);

    await queryRunner.commitTransaction();
  } catch (error: unknown) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};
