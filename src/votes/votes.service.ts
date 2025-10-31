import { AppDataSource } from "../config/data-source";
import { Vote } from "../entities/vote.entity";
import { PollOption } from "../entities/poll-option.entity";
// import { Poll } from "../entities/poll.entity";
// import { User } from "../entities/user.entity";
import { VoteResponseDto } from "./dto/vote-response.dto";
import { VoteDeleteResponseDto } from "./dto/vote-delete-response.dto";
import { OptionResult } from "../polls/dto/option-result.dto";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../types/error.type";

/**
 * 투표하기
 */
export const voteForOption = async (
  optionId: string,
  userId: string
): Promise<VoteResponseDto> => {
  const userRepository = AppDataSource.getRepository("User");
  const pollOptionRepository = AppDataSource.getRepository("PollOption");
  const pollRepository = AppDataSource.getRepository("Poll");
  const voteRepository = AppDataSource.getRepository("Vote");

  // 사용자 확인
  const user = await userRepository.findOne({
    where: { id: userId },
    relations: { apartment: true, resident: true },
  });

  if (!user) {
    throw new NotFoundError("사용자를 찾을 수 없습니다.");
  }

  // 옵션 확인
  const option = await pollOptionRepository.findOne({
    where: { id: optionId },
    relations: { poll: true },
  });

  if (!option) {
    throw new NotFoundError("투표 옵션을 찾을 수 없습니다.");
  }

  // 투표 정보 가져오기
  const poll = await pollRepository.findOne({
    where: { pollId: option.poll.pollId },
    relations: { options: true },
  });

  if (!poll) {
    throw new NotFoundError("투표를 찾을 수 없습니다.");
  }

  // 시간 확인
  const now = new Date();
  const startDate = new Date(poll.startDate);
  const endDate = new Date(poll.endDate);

  if (now < startDate) {
    throw new BadRequestError("투표가 아직 시작되지 않았습니다.");
  }

  if (now > endDate) {
    throw new BadRequestError("투표가 이미 종료되었습니다.");
  }

  // 투표 권한 확인 (buildingPermission)
  // 관리자(ADMIN)는 모든 투표 참여 가능

  if (user.role !== "ADMIN") {
    if (
      poll.buildingPermission !== undefined &&
      poll.buildingPermission !== null &&
      poll.buildingPermission !== 0 // 0이면 전체 공개
    ) {
      // dong 또는 building 필드 사용
      const userDongNumber = user.resident
        ? parseInt(user.resident.dong || user.resident.building)
        : null;

      if (userDongNumber) {
        // 직접 비교 또는 % 100 비교
        const isAuthorized =
          poll.buildingPermission === userDongNumber ||
          poll.buildingPermission % 100 === userDongNumber % 100;

        if (!isAuthorized) {
          throw new ForbiddenError("이 투표에 참여할 권한이 없습니다.");
        }
      } else {
        // 거주지 정보가 없으면 참여 불가
        throw new ForbiddenError("이 투표에 참여할 권한이 없습니다.");
      }
    }
  }
  // 이미 투표했는지 확인
  const existingVote = await voteRepository.findOne({
    where: {
      userId: userId,
      pollId: poll.pollId,
    },
  });

  if (existingVote) {
    throw new ConflictError("이미 투표하셨습니다.");
  }

  // 트랜잭션으로 투표 처리
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 투표 생성
    const vote = voteRepository.create({
      userId,
      pollId: poll.pollId,
      optionId,
      user,
      poll,
      option,
    });

    await queryRunner.manager.save(Vote, vote);

    // 투표 수 증가
    option.voteCount += 1;
    await queryRunner.manager.save(PollOption, option);

    await queryRunner.commitTransaction();

    // 업데이트된 옵션 정보
    const updatedOption: OptionResult = {
      id: option.id,
      title: option.title,
      votes: option.voteCount,
    };

    // 전체 옵션 정보 가져오기
    const allOptions = poll.options.map(
      (opt: { id: any; title: any; voteCount: any }) => ({
        id: opt.id,
        title: opt.title,
        votes: opt.id === option.id ? option.voteCount : opt.voteCount,
      })
    );

    // 가장 많은 투표를 받은 옵션 찾기
    const winnerOption = allOptions.reduce(
      (prev: { votes: number }, current: { votes: number }) =>
        prev.votes > current.votes ? prev : current
    );

    return {
      message: "투표가 성공적으로 등록되었습니다.",
      updatedOption,
      winnerOption,
      options: allOptions,
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};

/**
 * 투표 취소
 */
export const deleteVote = async (
  optionId: string,
  userId: string
): Promise<VoteDeleteResponseDto> => {
  const voteRepository = AppDataSource.getRepository("Vote");
  const pollOptionRepository = AppDataSource.getRepository("PollOption");
  const pollRepository = AppDataSource.getRepository("Poll");

  // 옵션 확인
  const option = await pollOptionRepository.findOne({
    where: { id: optionId },
    relations: { poll: true },
  });

  if (!option) {
    throw new NotFoundError("투표 옵션을 찾을 수 없습니다.");
  }

  // 투표 확인
  const poll = await pollRepository.findOne({
    where: { pollId: option.poll.pollId },
  });

  if (!poll) {
    throw new NotFoundError("투표를 찾을 수 없습니다.");
  }

  // 시간 확인
  const now = new Date();
  const endDate = new Date(poll.endDate);

  if (now > endDate) {
    throw new BadRequestError("투표가 이미 종료되어 취소할 수 없습니다.");
  }

  // 해당 사용자의 투표 찾기
  const vote = await voteRepository.findOne({
    where: {
      userId: userId,
      optionId: optionId,
      pollId: poll.pollId,
    },
  });

  if (!vote) {
    throw new NotFoundError("투표 기록을 찾을 수 없습니다.");
  }

  // 트랜잭션으로 투표 취소 처리
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    // 투표 삭제
    await queryRunner.manager.remove(Vote, vote);

    // 투표 수 감소
    option.voteCount = Math.max(0, option.voteCount - 1);
    await queryRunner.manager.save(PollOption, option);

    await queryRunner.commitTransaction();

    // 업데이트된 옵션 정보
    const updatedOption: OptionResult = {
      id: option.id,
      title: option.title,
      votes: option.voteCount,
    };

    return {
      message: "투표가 성공적으로 취소되었습니다.",
      updatedOption,
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
};
