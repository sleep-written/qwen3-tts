export interface NDJSONData {
    type:
        'standard' |
        'raw' |
        'system' |
        'stderr' |
        'warning' |
        'log' |
        'error';

    date: Date;
    message: string;
    payload?: any;
}