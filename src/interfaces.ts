export interface ServerInfo {
    name: string;
    path: string;
    status: 'init' | 'running' | 'stopped';
}