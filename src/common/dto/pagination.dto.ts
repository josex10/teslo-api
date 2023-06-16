import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

export class PaginationDto {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  offset?: number;
}
