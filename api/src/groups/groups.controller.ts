import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { GroupsService } from './groups.service';
import { GroupHomeService } from './group-home.service';

@Controller('groups')
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
    private readonly groupHome: GroupHomeService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      name: string;
      description?: string;
      avatarColor?: string;
    },
  ) {
    return this.groupsService.create({
      ...body,
      createdById: user.sub,
    });
  }

  @Get('home')
  @UseGuards(OptionalJwtAuthGuard)
  findHomeGroups(@CurrentUser() user?: AuthUser) {
    return this.groupHome.findHomeGroups(user?.sub);
  }

  @Get('home/all')
  @UseGuards(OptionalJwtAuthGuard)
  findAllGroups(@CurrentUser() user?: AuthUser) {
    return this.groupHome.findAllGroups(user?.sub);
  }

  @Get()
  findAll() {
    return this.groupsService.findAll();
  }

  @Get(':groupId')
  findOne(@Param('groupId') groupId: string) {
    return this.groupsService.findOne(groupId);
  }
}
