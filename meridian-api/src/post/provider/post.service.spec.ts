// Mock entities and aliased paths that Jest cannot resolve.
jest.mock('../post.entity', () => ({ Post: class Post {} }));
jest.mock('src/users/user.entity', () => ({ User: class User {} }), {
  virtual: true,
});
jest.mock('src/tag/tag.entity', () => ({ Tag: class Tag {} }), {
  virtual: true,
});
jest.mock('src/metaoption/metaoption.entity', () => ({}), {
  virtual: true,
});
jest.mock(
  'src/users/providers/user.services',
  () => ({ UserService: class UserService {} }),
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
  'src/auth/constant/auth-constant',
  () => ({ REQUEST_USER_KEY: 'user', AUTH_TYPE_kEY: 'authType' }),
  { virtual: true },
);
jest.mock('src/DTO/postparamdto', () => ({}), { virtual: true });
jest.mock('src/DTO/create-post.dto', () => ({}), { virtual: true });
jest.mock('src/DTO/patch-post.dto', () => ({}), { virtual: true });
jest.mock('src/DTO/getPostdto', () => ({}), { virtual: true });
jest.mock('src/common/pagination/dto/pagination-query.dto', () => ({}), {
  virtual: true,
});

import { PostsService } from './post.service';

describe('PostsService', () => {
  let service: PostsService;
  let postRepository: {
    find: jest.Mock;
    softDelete: jest.Mock;
    restore: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };
  let userService: { findOneId: jest.Mock };
  let tagService: { findMultiTag: jest.Mock };
  let paginationService: { paginatedQuery: jest.Mock };

  const mockAuthor = { id: 1, firstName: 'Jane', lastName: 'Doe' };
  const mockTags = [
    { id: 1, name: 'nestjs' },
    { id: 2, name: 'typescript' },
  ];
  const mockPost = {
    id: 10,
    title: 'Hello',
    content: 'World',
    author: mockAuthor,
    tags: mockTags,
  };

  beforeEach(() => {
    postRepository = {
      find: jest.fn(),
      softDelete: jest.fn(),
      restore: jest.fn(),
      create: jest.fn((dto) => ({ id: 10, ...dto })),
      save: jest.fn(async (post) => post),
      findOneBy: jest.fn(),
    };
    userService = { findOneId: jest.fn(async () => mockAuthor) };
    tagService = { findMultiTag: jest.fn(async () => mockTags) };
    paginationService = {
      paginatedQuery: jest.fn(async () => ({
        data: [mockPost],
        meta: { total: 1, page: 1, limit: 10 },
      })),
    };

    service = new PostsService(
      postRepository as any,
      userService as any,
      tagService as any,
      paginationService as any,
    );
  });

  describe('FindAllposts', () => {
    it('delegates to the pagination service and returns paginated results', async () => {
      const query = { limit: 10, page: 1 } as any;
      const result = await service.FindAllposts(query);

      expect(paginationService.paginatedQuery).toHaveBeenCalledWith(
        { limit: 10, page: 1 },
        postRepository,
      );
      expect(result).toEqual({
        data: [mockPost],
        meta: { total: 1, page: 1, limit: 10 },
      });
    });
  });

  describe('deleteOne', () => {
    it('soft-deletes a post by id and returns the deletion summary', async () => {
      postRepository.softDelete.mockResolvedValue({ affected: 1 });
      const result = await service.deleteOne(10);
      expect(postRepository.softDelete).toHaveBeenCalledWith(10);
      expect(result).toEqual({ deleted: true, id: 10 });
    });
  });

  describe('restorePost', () => {
    it('restores a soft-deleted post and returns the restoration summary', async () => {
      postRepository.restore.mockResolvedValue({ affected: 1 });
      const result = await service.restorePost(10);
      expect(postRepository.restore).toHaveBeenCalledWith(10);
      expect(result).toEqual({ restored: true, id: 10 });
    });

    it('throws HttpException when the post was not found or is not soft-deleted', async () => {
      postRepository.restore.mockResolvedValue({ affected: 0 });
      await expect(service.restorePost(404)).rejects.toThrow();
    });
  });

  describe('createPost', () => {
    it('resolves the author and tags, then persists a new post', async () => {
      const dto = {
        title: 'Hello',
        content: 'World',
        authorId: 1,
        tags: [1, 2],
      } as any;

      const result = await service.createPost(dto);

      expect(userService.findOneId).toHaveBeenCalledWith(1);
      expect(tagService.findMultiTag).toHaveBeenCalledWith([1, 2]);
      expect(postRepository.create).toHaveBeenCalledWith({
        ...dto,
        author: mockAuthor,
        tags: mockTags,
      });
      expect(postRepository.save).toHaveBeenCalled();
      expect(result).toMatchObject({
        title: 'Hello',
        content: 'World',
        author: mockAuthor,
        tags: mockTags,
      });
    });

    it('propagates errors thrown by userService.findOneId', async () => {
      userService.findOneId.mockRejectedValueOnce(new Error('author missing'));
      await expect(
        service.createPost({ authorId: 99, tags: [] } as any),
      ).rejects.toThrow('author missing');
    });
  });

  describe('UpdatePost', () => {
    it('resolves tags, applies patch fields, and saves the post', async () => {
      const existing = {
        id: 10,
        title: 'Old',
        content: 'Old content',
        imageUrl: 'old.png',
        postType: 'post',
        postStatus: 'draft',
        tags: [],
      };
      postRepository.findOneBy.mockResolvedValue(existing);

      const patch = {
        id: 10,
        title: 'New',
        content: 'New content',
        PostStatus: 'review',
      } as any;

      const result = await service.UpdatePost(patch);

      expect(tagService.findMultiTag).toHaveBeenCalledWith(patch.tags);
      expect(postRepository.findOneBy).toHaveBeenCalledWith({ id: 10 });
      expect(postRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New',
          content: 'New content',
          imageUrl: 'old.png',
          postType: 'post',
          postStatus: 'review',
          tags: mockTags,
        }),
      );
      expect(result).toMatchObject({ title: 'New', postStatus: 'review' });
    });

    it('keeps existing fields when the patch omits them', async () => {
      const existing = {
        id: 10,
        title: 'Same',
        content: 'Same',
        imageUrl: 'img.png',
        postType: 'post',
        postStatus: 'draft',
        tags: [mockTags[0]],
      };
      postRepository.findOneBy.mockResolvedValue(existing);

      const result = await service.UpdatePost({ id: 10 } as any);

      expect(result.title).toBe('Same');
      expect(result.imageUrl).toBe('img.png');
      expect(result.tags).toEqual(mockTags);
    });
  });
});
