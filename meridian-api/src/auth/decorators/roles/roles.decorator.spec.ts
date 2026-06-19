import { ROLES_KEY, Roles } from './roles.decorator';
import { Reflector } from '@nestjs/core';

// Mock the UserRole enum to avoid importing the full User entity
jest.mock(
  'src/users/user.entity',
  () => ({
    UserRole: { Admin: 'admin', User: 'user', Moderator: 'moderator' },
  }),
  { virtual: true },
);

import { UserRole } from 'src/users/user.entity';

describe('Roles decorator', () => {
  it('sets the ROLES_KEY metadata with a single role', () => {
    class TestController {
      @Roles(UserRole.Admin)
      testMethod() {
        /* no-op */
      }
    }

    const reflector = new Reflector();
    const roles = reflector.get<UserRole[]>(ROLES_KEY, TestController.prototype.testMethod);

    expect(roles).toBeDefined();
    expect(roles).toHaveLength(1);
    expect(roles).toContain(UserRole.Admin);
  });

  it('sets the ROLES_KEY metadata with multiple roles', () => {
    class TestController {
      @Roles(UserRole.Admin, UserRole.Moderator)
      testMethod() {
        /* no-op */
      }
    }

    const reflector = new Reflector();
    const roles = reflector.get<UserRole[]>(ROLES_KEY, TestController.prototype.testMethod);

    expect(roles).toBeDefined();
    expect(roles).toHaveLength(2);
    expect(roles).toContain(UserRole.Admin);
    expect(roles).toContain(UserRole.Moderator);
  });

  it('sets an empty roles array when called with no arguments', () => {
    class TestController {
      @Roles()
      testMethod() {
        /* no-op */
      }
    }

    const reflector = new Reflector();
    const roles = reflector.get<UserRole[]>(ROLES_KEY, TestController.prototype.testMethod);

    expect(roles).toBeDefined();
    expect(roles).toHaveLength(0);
  });
});
