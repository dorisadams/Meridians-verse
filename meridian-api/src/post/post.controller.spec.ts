import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as request from 'supertest';

jest.mock('../post/post.entity', () => ({ Post: class Post {} }));
jest.mock('src/users/user.entity', () => ({
  User: class User {},
  UserRole: { Admin: 'admin', User: 'user', Moderator: 'moderator' },
}), {
  virtual: true,
});
jest.mock('src/tag/tag.entity', () => ({ Tag: class Tag {} }), {
  virtual: true,
});
jest.mock('src/metaoption/metaoption.entity', () => ({}), { virtual: true });
jest.mock('src/metaoption/dto/create-post-meta-options.dto', () => ({}), {
  virtual: true,
});
jest.mock('src/metaoption/dto/update-post-meta-options.dto', () => ({}), {
  virtual: true,
});
jest.mock('src/metaoption/metaoption.controller', () => ({}), {
  virtual: true,
});
jest.mock(
  'src/users/providers/user.services',
  () => ({ UserService: class UserService {} }),
  { virtual: true },
);
jest.mock(
  './provider/post.service',
  () => ({ PostsService: class PostsService {} }),
  { virtual: true },
);
jest.mock(
  '../dto/post-param.dto',
  () => ({ GetPostsParamDto: class GetPostsParamDto {} }),
  { virtual: true },
);
jest.mock(
  '../dto/create-post.dto',
  () => ({ CreatePostDto: class CreatePostDto {} }),
  { virtual: true },
);
jest.mock(
  '../dto/patch-post.dto',
  () => ({ PatchPostDto: class PatchPostDto {} }),
  { virtual: true },
);
jest.mock(
  '../dto/get-posts.dto',
  () => ({ GetPostsDto: class GetPostsDto {} }),
  { virtual: true },
);
jest.mock(
  'src/tag/tags.service',
  () => ({ TagsService: class TagsService {} }),
  {
    virtual: true,
  },
);
jest.mock(
  'src/common/pagination/providers/pagination.provider',
  () => ({ Pagination: class Pagination {} }),
  { virtual: true },
);
jest.mock(
  'src/common/pagination/interfaces/paginated.interface',
  () => ({ Paginated: class Paginated {} }),
  { virtual: true },
);
jest.mock(
  'src/auth/guard/access-token/access-token.guard',
  () => ({ AccessTokenGuard: class AccessTokenGuard {} }),
  { virtual: true },
);
jest.mock(
  'src/auth/guard/roles/roles.guard',
  () => ({ RolesGuard: class RolesGuard {} }),
  { virtual: true },
);
jest.mock(
  'src/auth/decorators/roles/roles.decorator',
  () => {
    const { SetMetadata } = require('@nestjs/common');
    const ROLES_KEY = 'roles';
    const Roles = (...roles: any[]) => SetMetadata(ROLES_KEY, roles);
    return { Roles, ROLES_KEY };
  },
  { virtual: true },
);
jest.mock(
  'src/auth/constant/auth-constant',
  () => ({ REQUEST_USER_KEY: 'user', AUTH_TYPE_kEY: 'authType' }),
  { virtual: true },
);
jest.mock('src/DTO/postparamdto', () => ({}), { virtual: true });
jest.mock('src/DTO/create-post.dto', () => ({}), { virtual: true });
jest.mock('src/DTO/patch-post.dto', () => ({}), { virtual: true });
jest.mock('src/DTO/getPostdto', () => ({}), { virtual: true });

import { PostController } from './post.controller';
import { PostsService } from './provider/post.service';
import { UserRole } from 'src/users/user.entity';
import { ROLES_KEY } from 'src/auth/decorators/roles/roles.decorator';

describe('PostController (integration)', () => {
  let app: INestApplication;
  let postsService: {
    FindAllposts: jest.Mock;
    createPost: jest.Mock;
    deleteOne: jest.Mock;
    UpdatePost: jest.Mock;
  };

  beforeEach(async () => {
    postsService = {
      FindAllposts: jest.fn(async () => ({
        data: [{ id: 1, title: 'Hello' }],
        meta: { total: 1, page: 1, limit: 10 },
      })),
      createPost: jest.fn(async (dto) => ({ id: 1, ...dto })),
      deleteOne: jest.fn(async (id) => ({ deleted: true, id })),
      UpdatePost: jest.fn(async (dto) => ({ id: dto.id, ...dto })),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [PostController],
      providers: [{ provide: PostsService, useValue: postsService }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /posts delegates to FindAllposts', async () => {
    await request(app.getHttpServer())
      .get('/posts')
      .expect(200)
      .expect((res) => {
        expect(res.body.data).toHaveLength(1);
      });

    expect(postsService.FindAllposts).toHaveBeenCalled();
  });

  it('POST /posts delegates to createPost', async () => {
    const dto = {
      title: 'Hello',
      content: 'World',
      authorId: 1,
      tags: [1],
    };

    await request(app.getHttpServer())
      .post('/posts')
      .send(dto)
      .expect(201)
      .expect((res) => {
        expect(res.body.title).toBe('Hello');
      });

    expect(postsService.createPost).toHaveBeenCalledWith(
      expect.objectContaining(dto),
    );
  });

  it('DELETE /posts?id=N delegates to deleteOne', async () => {
    await request(app.getHttpServer())
      .delete('/posts?id=7')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ deleted: true, id: 7 });
      });

    expect(postsService.deleteOne).toHaveBeenCalledWith(7);
  });

  it('DELETE /posts returns 400 when id is not numeric', async () => {
    await request(app.getHttpServer()).delete('/posts?id=abc').expect(400);
  });

  it('PATCH /posts delegates to UpdatePost', async () => {
    const dto = { id: 1, title: 'Updated' };

    await request(app.getHttpServer())
      .patch('/posts')
      .send(dto)
      .expect(200)
      .expect((res) => {
        expect(res.body.id).toBe(1);
      });

    expect(postsService.UpdatePost).toHaveBeenCalledWith(
      expect.objectContaining(dto),
    );
  });

  // ── RBAC metadata checks ──────────────────────────────────────────
  describe('RBAC role metadata', () => {
    let reflector: Reflector;

    beforeEach(() => {
      reflector = new Reflector();
    });

    it('DELETE requires Admin or Moderator role', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, PostController.prototype.deleteOne);
      expect(roles).toBeDefined();
      expect(roles).toContain(UserRole.Admin);
      expect(roles).toContain(UserRole.Moderator);
      expect(roles).toHaveLength(2);
    });

    it('POST /:id/restore requires Admin or Moderator role', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, PostController.prototype.restorePost);
      expect(roles).toBeDefined();
      expect(roles).toContain(UserRole.Admin);
      expect(roles).toContain(UserRole.Moderator);
      expect(roles).toHaveLength(2);
    });

    it('PATCH requires Admin or Moderator role', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, PostController.prototype.updatePostTag);
      expect(roles).toBeDefined();
      expect(roles).toContain(UserRole.Admin);
      expect(roles).toContain(UserRole.Moderator);
      expect(roles).toHaveLength(2);
    });

    it('GET /posts does not require any role', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, PostController.prototype.getPosts);
      expect(roles).toBeUndefined();
    });

    it('POST /posts does not require any role', () => {
      const roles = reflector.get<UserRole[]>(ROLES_KEY, PostController.prototype.Createpost);
      expect(roles).toBeUndefined();
    });
  });
});
