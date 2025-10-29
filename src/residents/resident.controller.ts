import fs from 'fs';
import dayjs from 'dayjs';
import multer from 'multer';
import { Response, Request, NextFunction } from 'express';
import { createResidentSchema } from './dtos/create-resident.dto';
import * as ResidentService from './resident.service';
import { BadRequestError, NotFoundError, InternalServerError, ConflictError } from '../types/error.type';
import { AppDataSource } from '../config/data-source';
import { User } from '../entities/user.entity';
import { RESIDENT_CSV_TEMPLATE_PATH } from './resident.constants';
import { UpdatedResidentDto } from './dtos/update-resident.dto';
import { filterSchema } from './dtos/resident-filter.dto';
import { Payload } from '../types/payload.type';

/**
 * 개별 입주민 등록
 */
export const createResident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const parseResult = createResidentSchema.safeParse(req.body);

    if (!parseResult.success) {
      throw new BadRequestError('입주민 등록 요청 데이터가 유효하지 않습니다.');
    }

    const payload = req.user as Payload;

    const userRepository = AppDataSource.getRepository(User);
    const adminUser = await userRepository.findOne({
      where: { id: payload.id },
      relations: ['apartment'],
    });

    if (!adminUser?.apartmentId) {
      throw new BadRequestError('관리자 계정에 연결된 아파트 정보가 없습니다.');
    }

    const residentDto = await ResidentService.createResident(parseResult.data, adminUser.apartment!);

    return res.status(201).json(residentDto);
  } catch (error: unknown) {
    return next(error);
  }
};

/**
 * 사용자로부터 입주민 등록
 */
export const createResidentFromUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const { apartmentDong, apartmentHo } = req.body;

    if (!userId) {
      throw new BadRequestError('userId가 전달되지 않았습니다.');
    }

    if (!apartmentDong || !apartmentHo) {
      throw new BadRequestError('아파트 동과 호수는 필수 입력값입니다.');
    }

    const payload = req.user as Payload;

    const userRepository = AppDataSource.getRepository(User);
    const adminUser = await userRepository.findOne({
      where: { id: payload.id },
      relations: ['apartment'],
    });

    if (!adminUser?.apartmentId) {
      throw new BadRequestError('관리자 계정에 연결된 아파트 정보가 없습니다.');
    }

    const user = await userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('해당 사용자 정보를 찾을 수 없습니다.');
    }

    const residentDto = await ResidentService.createResidentFromUser(
      user,
      apartmentDong,
      apartmentHo,
      adminUser.apartment!
    );

    return res.status(201).json(residentDto);
  } catch (error: unknown) {
    return next(error);
  }
};

/**
 * 입주민 명부 템플릿 다운로드
 */
export const downloadResidentTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const payload = req.user as Payload;

    const userRepository = AppDataSource.getRepository(User);
    const adminUser = await userRepository.findOne({
      where: { id: payload.id },
      relations: ['apartment'],
    });

    if (!adminUser?.apartmentId) {
      throw new BadRequestError('관리자 계정에 연결된 아파트 정보가 없습니다.');
    }
    const filePath = RESIDENT_CSV_TEMPLATE_PATH;

    if (!fs.existsSync(filePath)) {
      throw new InternalServerError('템플릿 파일이 존재하지 않습니다.');
    }

    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const filename = `residents_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);
  } catch (error: unknown) {
    return next(error);
  }
};

/**
 * CSV 파일로 입주민 명부 업로드
 */
export const uploadResidentsFromFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const file = req.file;

    if (!file) {
      throw next(new BadRequestError('CSV 파일만 업로드 가능합니다.'));
    }

    const payload = req.user as Payload;

    const userRepository = AppDataSource.getRepository(User);
    const adminUser = await userRepository.findOne({
      where: { id: payload.id },
      relations: ['apartment'],
    });

    if (!adminUser?.apartmentId) {
      throw new BadRequestError('관리자 계정에 연결된 아파트 정보가 없습니다.');
    }

    const { count } = await ResidentService.registerResidentsFromCsv(file.buffer, adminUser.apartment!);

    return res.status(201).json({
      message: `${count}명의 입주민이 등록되었습니다.`,
      count,
    });
  } catch (error: unknown) {
    if (error instanceof multer.MulterError) {
      switch (error.code) {
        case 'LIMIT_FILE_SIZE':
          return next(new BadRequestError('업로드 가능한 파일 크기를 초과했습니다.'));
        case 'LIMIT_UNEXPECTED_FILE':
          return next(new BadRequestError('CSV 파일만 업로드 가능합니다.'));
        default:
          return next(new BadRequestError(`파일 업로드 오류 (${error.code})`));
      }
    }
    if (error instanceof ConflictError) {
      return next(error);
    }
    return next(error);
  }
};

/**
 * 입주민 목록 조회
 */
export const residentList = async (req: Request, res: Response, next: NextFunction) => {
  try {

    const payload = req.user as Payload;

    const userRepository = AppDataSource.getRepository(User);
    const adminUser = await userRepository.findOne({
      where: { id: payload.id },
      relations: ['apartment'],
    });

    if (!adminUser?.apartmentId) {
      throw new BadRequestError('관리자 계정에 연결된 아파트 정보가 없습니다.');
    }

    const parseResult = filterSchema.safeParse(req.query);

    if (!parseResult.success) {
      throw new BadRequestError('입주민 목록 조회 요청 데이터가 유효하지 않습니다.');
    }

    const filter = parseResult.data;

    const { residents } = await ResidentService.getResidentList({
      apartmentId: adminUser.apartmentId,
      building: filter.building,
      unitNumber: filter.unitNumber,
      residenceStatus: filter.residenceStatus,
      isRegistered: filter.isRegistered,
      name: filter.name,
      contact: filter.contact,
    });

    return res.status(200).json({
      residents,
      count: residents.length,
      message: '입주민 목록 조회 성공',
    });
  }
  catch (error: unknown) {
    return next(error);
  }
}

/**
 * 입주민 목록 파일 다운로드
 */
export const downloadResidentCsv = async (req: Request, res: Response) => {
  try {
    const payload = req.user as Payload;

    const userRepository = AppDataSource.getRepository(User);
    const adminUser = await userRepository.findOne({
      where: { id: payload.id },
      relations: ['apartment'],
    });

    if (!adminUser?.apartmentId) {
      throw new BadRequestError('관리자 계정에 연결된 아파트 정보가 없습니다.');
    }

    const csvData = await ResidentService.residentListCsv(adminUser.apartment!.id);

    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const filename = `residents_${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );
    res.status(200).send(csvData);
  } catch (error) {
    console.error('CSV 다운로드 실패:', error);
    res.status(500).json({ message: '입주민 목록 파일 다운로드 중 서버 오류가 발생했습니다.' });
  }
};


/** 
 * 입주민 상세 조회
 */
export const residentDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const payload = req.user as Payload;

    const userRepository = AppDataSource.getRepository(User);
    const adminUser = await userRepository.findOne({
      where: { id: payload.id },
      relations: ['apartment'],
    });

    if (!adminUser?.apartmentId) {
      throw new BadRequestError('관리자 계정에 연결된 아파트 정보가 없습니다.');
    }
    if (!id) {
      throw new BadRequestError('입주민 Id가 필요합니다.');
    }

    const resident = await ResidentService.residentListDetail(id, adminUser.apartment!.id);

    return res.status(200).json(resident);
  } catch (error: unknown) {
    return next(error);
  }
};

/**
 * 입주민 정보 수정
 */
export const updateResident = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData: UpdatedResidentDto = req.body;

    const payload = req.user as Payload;

    const userRepository = AppDataSource.getRepository(User);
    const adminUser = await userRepository.findOne({
      where: { id: payload.id },
      relations: ['apartment'],
    });

    if (!adminUser?.apartmentId) {
      throw new BadRequestError('관리자 계정에 연결된 아파트 정보가 없습니다.');
    }
    if (!id) {
      throw new BadRequestError('입주민 Id가 필요합니다.');
    }

    const updatedResident = await ResidentService.updateResident(id, adminUser.apartment!.id, updateData);

    return res.status(200).json(updatedResident);

  } catch (error: unknown) {
    return next(error);
  }
}

/**
 * 입주민 삭제
 */
export const deleteResident = async (req: Request, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const payload = req.user as Payload;

  try {

    const userRepository = AppDataSource.getRepository(User);
    const adminUser = await userRepository.findOne({
      where: { id: payload.id },
      relations: ['apartment'],
    });

    if (!adminUser?.apartmentId) {
      throw new BadRequestError('관리자 계정에 연결된 아파트 정보가 없습니다.');
    }
    if (!id) {
      throw new BadRequestError('입주민 Id가 필요합니다.');
    }

    await ResidentService.deleteResident(id, adminUser.apartment!.id);

    return res.status(200).json({ message: '작업이 성공적으로 완료되었습니다.' });
  } catch (error: unknown) {
    return next(error);
  }
};
