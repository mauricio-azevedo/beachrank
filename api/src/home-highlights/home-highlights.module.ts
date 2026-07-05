import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { WeeklyHighlightsProjectionService } from './weekly-highlights-projection.service';
import { WeeklyHighlightsReadService } from './weekly-highlights-read.service';
import { WeeklyHighlightsController } from './weekly-highlights.controller';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [WeeklyHighlightsController],
  providers: [WeeklyHighlightsProjectionService, WeeklyHighlightsReadService],
  exports: [WeeklyHighlightsProjectionService],
})
export class HomeHighlightsModule {}
