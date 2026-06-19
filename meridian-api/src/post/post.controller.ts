import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Patch,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  ValidationPipe,
  UseGuards,
} from '@nestjs/common';
import { PostsService } from './provider/post.service';
import { GetPostsParamDto } from './dto/post-param.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PatchPostDto } from './dto/patch-post.dto';
import { GetPostsDto } from './dto/get-posts.dto';
import { AccessTokenGuard } from 'src/auth/guard/access-token/access-token.guard';
import { RolesGuard } from 'src/auth/guard/roles/roles.guard';
import { Roles } from 'src/auth/decorators/roles/roles.decorator';
import { UserRole } from 'src/users/user.entity';

@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostsService) {}

  @Get('/:id?')
  @ApiOperation({
    summary: 'Fetch all posts with optional filtering and pagination',
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved posts' })
  public getPosts(@Query() getPostDto: GetPostsDto) {
    return this.postService.FindAllposts(getPostDto);
    console.log(getPostDto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new post' })
  @ApiResponse({ status: 201, description: 'Post created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / Validation failure' })
  public Createpost(@Body() createpostdto: CreatePostDto) {
    // console.log(createpostdto instanceof CreatePostDto)
    return this.postService.createPost(createpostdto);
  }

  @Delete()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Moderator)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Soft-delete a post (issue #427)' })
  @ApiResponse({ status: 200, description: 'Post soft-deleted successfully' })
  public deleteOne(@Query('id', ParseIntPipe) id: number) {
    return this.postService.deleteOne(id);
  }

  @Post('/:id/restore')
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Moderator)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore a soft-deleted post by ID' })
  @ApiResponse({ status: 200, description: 'Post restored successfully' })
  @ApiResponse({
    status: 404,
    description: 'Post not found or not soft-deleted',
  })
  public restorePost(@Param('id', ParseIntPipe) id: number) {
    return this.postService.restorePost(id);
  }

  @Patch()
  @UseGuards(AccessTokenGuard, RolesGuard)
  @Roles(UserRole.Admin, UserRole.Moderator)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing post' })
  @ApiResponse({ status: 200, description: 'Post updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request / Validation failure' })
  public updatePostTag(@Body() patchPostDto: PatchPostDto) {
    return this.postService.UpdatePost(patchPostDto);
  }
}
