export type RootParamList = {
    landing: undefined;
    login: undefined;
    register: undefined;
    dashboard: { username: string };
    myclass: { username: string; classId?: number };
    attendance: { username: string; classId?: number };
    gradebook: { username: string; classId?: number };
    settings: { username: string };
    academichistory: { username: string; schoolYear?: string };
};
