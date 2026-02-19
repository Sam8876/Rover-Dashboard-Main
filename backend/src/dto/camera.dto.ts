export class CameraDataDto {
    type: 'frame' | 'yolo';
    data?: any;
    objects?: Array<{
        x: number;
        y: number;
        w: number;
        h: number;
        label: string;
        conf: string;
    }>;
}
