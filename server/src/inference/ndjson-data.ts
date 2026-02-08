export interface NDJSONData {
    type:
        'standard' |
        'garbage' |
        'system' |
        'stderr' |
        'warning' |
        'log' |
        'error';

    date: Date;
    message: string;
    payload?: any;
}