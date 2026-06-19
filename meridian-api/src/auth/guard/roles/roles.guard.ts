import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from 'src/auth/decorators/roles/roles.decorator';
import { REQUEST_USER_KEY } from 'src/auth/constant/auth-constant';
import { UserRole } from 'src/users/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request[REQUEST_USER_KEY];

    if (!user?.role || !requiredRoles.includes(user.role)) {
      throw new ForbiddenException('Insufficient role permissions');
    }

    return true;
  }
}
