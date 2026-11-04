export type RootParamList = {
    login: undefined;
    register: undefined;
    dashboard: { username: string };
    myclass: { username: string };
    attendance: { username: string };
    gradebook: { username: string };
    settings: { username: string };
};
