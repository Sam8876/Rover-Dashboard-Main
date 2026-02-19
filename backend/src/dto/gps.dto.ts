import { IsNumber, Min, Max } from 'class-validator';

export class GpsDataDto {
    @IsNumber()
    lat: number;

    @IsNumber()
    lon: number;

    @IsNumber()
    @Min(0)
    speed: number; // km/h

    @IsNumber()
    @Min(0)
    @Max(360)
    heading: number; // degrees 0-360
}
