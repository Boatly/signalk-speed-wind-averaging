interface IPlugin {
    start: (app: any) => void;
    stop: () => void;
    statusMessage: (msg: string) => void;
    signalKApiRoutes: (router: any) => void;
    started: boolean;
    id: string;
    name: string;
    description: string;
    schema: any;
}
export default function (app: any): IPlugin;
export {};
