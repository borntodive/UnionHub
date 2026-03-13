import { User } from './user.entity';
export declare enum StatusChangeType {
    ACTIVATION = "activation",
    DEACTIVATION = "deactivation",
    REACTIVATION = "reactivation"
}
export declare class UserStatusHistory {
    id: string;
    userId: string;
    user: User;
    changeType: StatusChangeType;
    reason: string | null;
    changedById: string | null;
    createdAt: Date;
}
