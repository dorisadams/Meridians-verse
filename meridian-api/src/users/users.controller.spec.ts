import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as request from 'supertest';

// Mocks for aliased paths that Jest cannot resolve.
jest.mock('src/DTO/create-user.dto', () => ({}), { virtual: true });
jest.mock('src/DTO/userparamdto', () => ({}), { virtual: true });
jest.mock('src/DTO/patch-user.dto', () => ({}), { virtual: true });
jest.mock('./dtos/createManyUserdto', () => ({}), { virtual: true });
jest.mock('./user.entity', () => ({
  User: class User {},
  UserRole: { Admin: 'admin', User: 'user', Moderator: 'moderator' },
}));
jest.mock(
  '../auth/providers/user-auth.facade',
  () => ({ UserAuthFacade: class UserAuthFacade {} }),
  { virtual: true },
);
jest.mock(
  'src/auth/providers/hashing',
  () => ({ HashingProvider: class HashingProvider {} }),
  { virtual: true },
);

import { UsersController } from './users.controller';
import { UserService } from './providers/user.services';
import { UserRole } from './user.entity';
import { ROLES_KEY } from 'src/auth/decorators/roles/roles.decorator';

describe('UsersController (integration)', () => {
  let app: INestApplication;
  let userService: {
    findAll: jest.Mock;
    createUsers: jest.Mock;
    createMany: jest.Mock;
    deleteUser: jest.Mock;
    editUser: jest.Mock;
    createUserWithBook: jest.Mock;
    getAllUserWithBook: jest.Mock;
    findOneById: jest.Mock;
    findOneId: jest.Mock;
  };

  beforeEach(async () => {
    userService = {
      findAll: jest.fn(async () => [
        {
          id: 1,
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        },
      ]),
      createUsers: jest.fn(async () => [
        {
          id: 1,
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane@example.com',
        },
      ]),
      createMany: jest.fn(async () => [{ id: 1 }, { id: 2 }]),
      deleteUser: jest.fn(),
      editUser: jest.fn(async (dto) => ({ ...dto })),
      createUserWithBook: jest.fn(async () => ({ id: 1 })),
      getAllUserWithBook: jest.fn(async () => [{ id: 1 }]),
      findOneById: jest.fn(async (id: number) =>
        id === 1 ? { id, firstName: 'Jane' } : null,
      ),
      findOneId: jest.fn(async () => ({ id: 1, firstName: 'Jane' })),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /users forwards query params to findAll', async () => {
    await request(app.getHttpServer())
      .get('/users/1?limit=25&page=2')
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
      });

    expect(userService.findAll).toHaveBeenCalled();
    const [paramArg, limitArg, pageArg] = userService.findAll.mock.calls[0];
    expect(limitArg).toBe(25);
    expect(pageArg).toBe(2);
    expect(paramArg).toBeDefined();
  });

  it('POST /users creates a single user', async () => {
    const dto = {
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'plain',
    };

    await request(app.getHttpServer())
      .post('/users')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toEqual([
          expect.objectContaining({ email: 'jane@example.com' }),
        ]);
      });

    expect(userService.createUsers).toHaveBeenCalledWith(
      expect.objectContaining(dto),
    );
  });

  it('POST /users/many-users creates multiple users', async () => {
    const dto = {
      users: [
        {
          firstName: 'A',
          lastName: 'B',
          email: 'a@b.com',
          password: 'pw',
        },
        {
          firstName: 'C',
          lastName: 'D',
          email: 'c@d.com',
          password: 'pw',
        },
      ],
    };

    await request(app.getHttpServer())
      .post('/users/many-users')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body).toHaveLength(2);
      });

    expect(userService.createMany).toHaveBeenCalledWith(dto);
  });

  it('DELETE /users responds with status 200', async () => {
    const response = await request(app.getHttpServer())
      .delete('/users')
      .expect(200);
    expect(response).toBeDefined();
  });

  it('PATCH /users updates user details', async () => {
    const dto = { id: 1, firstName: 'Updated' };

    await request(app.getHttpServer())
      .patch('/users')
      .send(dto)
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject(dto);
      });

    expect(userService.editUser).toHaveBeenCalledWith(dto);
  });

  it('POST /users/with-book creates a user with a book', async () => {
    const dto = { firstName: 'Ada', email: 'ada@example.com', password: 'pw' };

    await request(app.getHttpServer())
      .post('/users/with-book')
      .send(dto)
      .expect(201);

    expect(userService.createUserWithBook).toHaveBeenCalledWith(
      expect.objectContaining(dto),
    );
  });

  it('GET /users/with-book returns users with their books', async () => {
    const response = await request(app.getHttpServer()).get('/users/with-book');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject([{ id: 1 }]);
  });

  it('GET /users/find/:id returns the user', async () => {
    await request(app.getHttpServer())
      .get('/users/find/1')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({ id: 1 });
      });

    expect(userService.findOneById).toHaveBeenCalledWith(1);
  });

  it('GET /users/find/:id returns 400 for a non-numeric id', async () => {
    await request(app.getHttpServer())
      .get('/users/find/not-a-number')
      .expect(400);
  });

  // ── RBAC metadata checks ──────────────────────────────────────────
  describe('RBAC role metadata', () => {
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
    });

    it('DELETE /:id requires Admin role', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, UsersController.prototype.deleteUsers);
      expect(roles).toBeDefined();
      expect(roles).toContain(UserRole.Admin);
      expect(roles).toHaveLength(1);
    });

    it('POST /:id/restore requires Admin role', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, UsersController.prototype.restoreUser);
      expect(roles).toBeDefined();
      expect(roles).toContain(UserRole.Admin);
      expect(roles).toHaveLength(1);
    });

    it('POST /many-users requires Admin role', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, UsersController.prototype.createMany);
      expect(roles).toBeDefined();
      expect(roles).toContain(UserRole.Admin);
      expect(roles).toHaveLength(1);
    });

    it('PATCH requires Admin or Moderator role', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, UsersController.prototype.editedPost);
      expect(roles).toBeDefined();
      expect(roles).toContain(UserRole.Admin);
      expect(roles).toContain(UserRole.Moderator);
      expect(roles).toHaveLength(2);
    });

    it('GET /:id does not require any role', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, UsersController.prototype.getUsers);
      expect(roles).toBeUndefined();
    });

    it('POST /users does not require any role', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, UsersController.prototype.createUsers);
      expect(roles).toBeUndefined();
    });
  });
});
