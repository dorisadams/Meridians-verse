import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  ParseIntPipe,
  DefaultValuePipe,
  ValidationPipe,
  Patch,
  UseGuards,
  SetMetadata,
  UseInterceptors,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { GetuserParamDto } from './dto/user-param.dto';
import { UserService } from './providers/user.services';
import { EditUserDto } from './dto/patch-user.dto';
import {
  ApiResponse,
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AccessTokenGuard } from 'src/auth/guard/access-token/access-token.guard';
import { RolesGuard } from 'src/auth/guard/roles/roles.guard';
import { Roles } from 'src/auth/decorators/roles/roles.decorator';
import { Auth } from 'src/auth/decorators/auth/auth.decorator';
import { AuthType } from 'src/auth/enums/auth-type.enum';
import { UserRole } from './user.entity';
import { CreateManyUsersDto } from './dto/create-many-users.dto';

@Controller('users')
// line 14 is a method
// TO GEt users
@ApiTags('Users')
export class UsersController {
  // performing an dependencies injection online 17
  constructor(private readonly userService: UserService) {}

  // doing validation with pipes on line 33 to 34
  // http://localhost:3000/users/23333?search=John&role=admin
  // to search on url for params and query

  // performing api description for @Get which displays in our swagger in the browser
  @ApiResponse({
    status: 200,
    description: 'users fetched successfully based on the query',
  })
  @ApiOperation({
    summary: 'Fetch all the users',
  })

  //using a guard
  // @UseGuards(AccessTokenGuard)
  @Get('/:id?')
  @ApiQuery({
    name: 'limit',
    type: 'number',
    required: false,
    description: 'the number of entries returned per query',
  })
  @ApiQuery({
    name: 'page',
    type: 'number',
    required: false,
    description: 'the page number of entries returned per query',
  })
  @Auth(AuthType.Bearer)
  @ApiBearerAuth()
  public getUsers(
    @Param() getuserParamDto: GetuserParamDto,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
  ) {
    // we have tranform and validate our id,Query using pipe
    console.log(getuserParamDto);
    return this.userService.findAll(getuserParamDto, limit, page);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @UseInterceptors(ClassSerializerInterceptor)
  // @SetMetadata('authType, 'None')
  @Auth(AuthType.None)
  public createUsers(@Body() createUserDto: CreateUserDto) {
    // console.log(createUserDto instanceof CreateUserDto)
    return this.userService.createUsers(createUserDto);
  }

  @Post('/many-users')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create multiple users' })
  @ApiResponse({ status: 201, description: 'Users created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  public createMany(@Body() createManyUserDto: CreateManyUsersDto) {
    return this.userService.createMany(createManyUserDto);
  }

  @Delete('/:id')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a user by ID (issue #427)' })
  @ApiResponse({ status: 200, description: 'User soft-deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  public deleteUsers(@Param('id', ParseIntPipe) id: number) {
    return this.userService.deleteUser(id);
  }

  @Post('/:id/restore')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore a soft-deleted user by ID' })
  @ApiResponse({ status: 200, description: 'User restored successfully' })
  @ApiResponse({
    status: 404,
    description: 'User not found or not soft-deleted',
  })
  public restoreUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.restoreUser(id);
  }

  @Patch()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Moderator)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user details' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  public editedPost(@Body() edituserDto: EditUserDto) {
    return this.userService.editUser(edituserDto);
  }

  @Post('/with-book')
  @ApiOperation({ summary: 'Create user with a default book entry' })
  @ApiResponse({
    status: 201,
    description: 'User and book created successfully',
  })
  @ApiResponse({ status: 400, description: 'Bad request' })
  public createUserWithBook(@Body() userDto: CreateUserDto) {
    return this.userService.createUserWithBook(userDto);
  }

  @Get('/with-book')
  @ApiOperation({ summary: 'Fetch all users with their books' })
  @ApiResponse({
    status: 200,
    description: 'List of users with books retrieved successfully',
  })
  public getAllUsersWithBook() {
    return this.userService.getAllUserWithBook();
  }

  @Get('find/:id')
  @ApiOperation({ summary: 'Fetch a single user by ID' })
  @ApiResponse({ status: 200, description: 'User retrieved successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  public getUserbyId(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOneById(id);
  }
}
