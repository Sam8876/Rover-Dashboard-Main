import { IsNumber, Min } from 'class-validator';

export class RadarDataDto {
    @IsNumber()
    @Min(0)
    front: number; // cm

    @IsNumber()
    @Min(0)
    right: number; // cm

    @IsNumber()
    @Min(0)
    back: number; // cm

    @IsNumber()
    @Min(0)
    left: number; // cm
}
