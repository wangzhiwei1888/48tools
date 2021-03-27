import * as path from 'path';
import * as process from 'process';
import { Worker } from 'worker_threads';
import { ipcMain, IpcMainEvent } from 'electron';

const isDevelopment: boolean = process.env.NODE_ENV === 'development';
let nodeMediaServerWorker: Worker | null = null;

export interface NodeMediaServerArg {
  ffmpeg: string;   // ffmpeg路径
  rtmpPort: number; // rtmp端口号
  httpPort: number; // http端口号
}

/* 关闭node-media-server服务 */
export async function nodeMediaServerClose(): Promise<void> {
  if (nodeMediaServerWorker) {
    await nodeMediaServerWorker.terminate();
    nodeMediaServerWorker = null;
  }
}

/* 初始化node-media-server服务 */
export function nodeMediaServerInit(): void {
  ipcMain.on('node-media-server', async function(event: IpcMainEvent, arg: NodeMediaServerArg): Promise<void> {
    await nodeMediaServerClose(); // electron刷新时，已存在的node-media-server会有问题，所以需要重新创建服务

    nodeMediaServerWorker = new Worker(path.join(__dirname, 'server.worker.js'), {
      workerData: {
        ...arg,
        isDevelopment
      }
    });
  });
}