jest.mock(
  'src/auth/decorators/roles/roles.decorator',
  () => ({ ROLES_KEY: 'roles' }),
  { virtual: true },
);
jest.mock(
  'src/auth/constant/auth-constant',
  () => ({ REQUEST_USER_KEY: 'user' }),
  { virtual: true },
);
jest.mock(
  'src/users/user.entity',
  () => ({
    UserRole: { Admin: 'admin', User: 'user', Moderator: 'moderator' },
  }),
  { virtual: true },
);

import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { ROLES_KEY } from 'src/auth/decorators/roles/roles.decorator';
import { REQUEST_USER_KEY } from 'src/auth/constant/auth-constant';
import { UserRole } from 'src/users/user.entity';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Pick<Reflector, 'getAllAndOverride'>>;

  const buildContext = (
    user?: Record<string, unknown> | null,
  ): ExecutionContext => {
    const request = { [REQUEST_USER_KEY]: user };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as unknown as ExecutionContext;
  };

  const stubRoles = (...roles: UserRole[]) => {
    reflector.getAllAndOverride.mockReturnValue(roles);
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  describe('no roles required', () => {
    it('returns true when requiredRoles is undefined', () => {
      reflector.getAllAndOverride.mockReturnValue(undefined);
      const ctx = buildContext({ role: UserRole.User });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('returns true when requiredRoles is an empty array', () => {
      stubRoles();
      const ctx = buildContext({ role: UserRole.User });

      expect(guard.canActivate(ctx)).toBe(true);
    });
  });

  describe('roles required', () => {
    it('returns true when user has a matching role', () => {
      stubRoles(UserRole.Admin);
      const ctx = buildContext({ role: 'admin' });

      expect(guard.canActivate(ctx)).toBe(true);
      expect(reflector.getAllAndOverride).toHaveBeenCalledWith(ROLES_KEY, [
        ctx.getHandler(),
        ctx.getClass(),
      ]);
    });

    it('returns true when user role matches one of multiple required roles', () => {
      stubRoles(UserRole.Admin, UserRole.Moderator);
      const ctx = buildContext({ role: 'moderator' });

      expect(guard.canActivate(ctx)).toBe(true);
    });

    it('throws ForbiddenException when user has no role property', () => {
      stubRoles(UserRole.Admin);
      const ctx = buildContext({});

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when user role is not in the required list', () => {
      stubRoles(UserRole.Admin);
      const ctx = buildContext({ role: 'user' });

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });

    it('throws ForbiddenException when user is not on the request', () => {
      stubRoles(UserRole.Admin);
      const ctx = buildContext(null);

      expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
    });
  });
});
