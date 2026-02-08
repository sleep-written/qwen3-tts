export interface NDJSONData {
    type:
        'standard' |
        'stdout' |
        'stderr';

    date: Date;
    message: string;
    payload?: any;
}
