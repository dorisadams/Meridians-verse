// Mock entities that import src/-aliased paths not available in Jest
jest.mock('../user.entity', () => ({ User: class User {} }), { virtual: true });
jest.mock('src/post/post.entity', () => ({ Post: class Post {} }), {
  virtual: true,
});
jest.mock('src/tweets/dto/tweet.entity', () => ({ Tweet: class Tweet {} }), {
  virtual: true,
});
jest.mock(
  'src/auth/providers/hashing',
  () => ({ HashingProvider: class HashingProvider {} }),
  { virtual: true },
);
jest.mock(
  'src/mail/providers/mail.provider',
  () => ({ MailProvider: class MailProvider {} }),
  { virtual: true },
);
jest.mock(
  'src/commom/userAlreadyExistException',
  () => ({ UserAlreadyExistException: class UserAlreadyExistException {} }),
  { virtual: true },
);
jest.mock('src/DTO/create-user.dto', () => ({}), { virtual: true });
jest.mock('src/DTO/postparamdto', () => ({}), { virtual: true });
jest.mock('src/DTO/patch-user.dto', () => ({}), { virtual: true });

import { HttpException } from '@nestjs/common';
import { UserService } from './user.services';

describe('UserService', () => {
  let service: UserService;
  let usersRepository: {
    find: jest.Mock;
    findOneBy: jest.Mock;
    save: jest.Mock;
    softDelete: jest.Mock;
    restore: jest.Mock;
  };
  let createuserprovider: { createUsers: jest.Mock };
  let findOneByemail: { findOneByEmail: jest.Mock };
  let createUserWithBooks: {
    createUserwithBook: jest.Mock;
    getAllUserWithBook: jest.Mock;
  };
  let createManyUserService: { manyUsers: jest.Mock };

  const mockUser = {
    id: 1,
    firstName: 'Jane',
    lastName: 'Doe',
    email: 'jane@example.com',
    password: 'hashed',
  };

  beforeEach(() => {
    usersRepository = {
      find: jest.fn(async () => [mockUser]),
      findOneBy: jest.fn(async () => mockUser),
      save: jest.fn(async (u) => u),
      softDelete: jest.fn(),
      restore: jest.fn(),
    };
    createuserprovider = { createUsers: jest.fn(async () => [mockUser]) };
    findOneByemail = { findOneByEmail: jest.fn(async () => mockUser) };
    createUserWithBooks = {
      createUserwithBook: jest.fn(async () => mockUser),
      getAllUserWithBook: jest.fn(async () => [mockUser]),
    };
    createManyUserService = { manyUsers: jest.fn(async () => [mockUser]) };

    service = new UserService(
      usersRepository as any,
      createuserprovider as any,
      findOneByemail as any,
      createUserWithBooks as any,
      createManyUserService as any,
    );
  });

  it('findAll returns users from repository', async () => {
    const result = await service.findAll({} as any, 10, 1);
    expect(result).toEqual([mockUser]);
    expect(usersRepository.find).toHaveBeenCalled();
  });

  it('createUsers delegates to createuserprovider', async () => {
    const dto = {
      email: 'jane@example.com',
      password: 'pass',
      firstName: 'Jane',
      lastName: 'Doe',
    } as any;
    const result = await service.createUsers(dto);
    expect(createuserprovider.createUsers).toHaveBeenCalledWith(dto);
    expect(result).toEqual([mockUser]);
  });

  it('GetOneByEmail delegates to findOneByemail', async () => {
    const result = await service.GetOneByEmail('jane@example.com');
    expect(findOneByemail.findOneByEmail).toHaveBeenCalledWith(
      'jane@example.com',
    );
    expect(result).toEqual(mockUser);
  });

  it('findOneId returns user when found', async () => {
    const result = await service.findOneId(1);
    expect(usersRepository.findOneBy).toHaveBeenCalledWith({ id: 1 });
    expect(result).toEqual(mockUser);
  });

  it('findOneId throws NOT_FOUND when user is missing', async () => {
    usersRepository.findOneBy.mockResolvedValue(null);
    await expect(service.findOneId(99)).rejects.toThrow(HttpException);
  });

  it('editUser saves updated user', async () => {
    const dto = { id: 1, firstName: 'Updated' } as any;
    await service.editUser(dto);
    expect(usersRepository.save).toHaveBeenCalled();
  });

  it('editUser keeps existing fields when fields are missing', async () => {
    const stored = { ...mockUser };
    usersRepository.findOneBy.mockResolvedValueOnce(stored);
    usersRepository.save.mockImplementationOnce(async (u) => u);

    const result = await service.editUser({ id: 1 } as any);

    expect(result).toMatchObject({
      firstName: stored.firstName,
      lastName: stored.lastName,
      email: stored.email,
      password: stored.password,
    });
  });

  it('deleteUser soft-deletes the user and returns the deletion summary', async () => {
    usersRepository.findOneBy.mockResolvedValue(mockUser);
    const result = await service.deleteUser(1);
    expect(usersRepository.softDelete).toHaveBeenCalledWith(1);
    expect(result).toEqual({ deleted: true, id: 1 });
  });

  it('deleteUser throws HttpException when user is not found', async () => {
    usersRepository.findOneBy.mockResolvedValue(null);
    await expect(service.deleteUser(99)).rejects.toThrow(HttpException);
  });

  describe('restoreUser', () => {
    it('restores a soft-deleted user and returns the restoration summary', async () => {
      usersRepository.restore.mockResolvedValue({ affected: 1 });
      const result = await service.restoreUser(1);
      expect(usersRepository.restore).toHaveBeenCalledWith(1);
      expect(result).toEqual({ restored: true, id: 1 });
    });

    it('throws HttpException when the user was not found or is not soft-deleted', async () => {
      usersRepository.restore.mockResolvedValue({ affected: 0 });
      await expect(service.restoreUser(404)).rejects.toThrow(HttpException);
    });
  });

  it('createMany delegates to the createManyUserService', async () => {
    const dto = { users: [{ email: 'a@b.com' }, { email: 'c@d.com' }] } as any;
    const result = await service.createMany(dto);
    expect(createManyUserService.manyUsers).toHaveBeenCalledWith(dto);
    expect(result).toEqual([mockUser]);
  });

  it('createUserWithBook delegates to the createUserWithBooks provider', async () => {
    const dto = { email: 'a@b.com', password: 'pw' } as any;
    const result = await service.createUserWithBook(dto);
    expect(createUserWithBooks.createUserwithBook).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockUser);
  });

  it('getAllUserWithBook delegates to the createUserWithBooks provider', async () => {
    const result = await service.getAllUserWithBook();
    expect(createUserWithBooks.getAllUserWithBook).toHaveBeenCalled();
    expect(result).toEqual([mockUser]);
  });

  it('findOneById returns the matching user', async () => {
    const result = await service.findOneById(42);
    expect(usersRepository.findOneBy).toHaveBeenCalledWith({ id: 42 });
    expect(result).toEqual(mockUser);
  });

  it('findOneById returns null for an unknown id', async () => {
    usersRepository.findOneBy.mockResolvedValueOnce(null);
    const result = await service.findOneById(404);
    expect(result).toBeNull();
  });
});
