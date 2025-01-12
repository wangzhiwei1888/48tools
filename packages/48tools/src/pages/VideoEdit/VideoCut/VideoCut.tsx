import type { SaveDialogReturnValue } from 'electron';
import { dialog } from '@electron/remote';
import { Fragment, ReactElement, MouseEvent } from 'react';
import type { Dispatch } from 'redux';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector, createStructuredSelector, Selector } from 'reselect';
import { Table, Button, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import CutWorker from 'worker-loader!./cut.worker';
import Header from '../../../components/Header/Header';
import CutForm from './CutForm';
import {
  setCutListDelete,
  setCutChildListAdd,
  setCutChildListDelete,
  VideoCutInitialState
} from '../reducers/videoCut';
import { getFFmpeg } from '../../../utils/utils';
import type { WebWorkerChildItem, MessageEventData } from '../../../types';
import type { CutItem } from '../types';

/* redux selector */
const selector: Selector<any, VideoCutInitialState> = createStructuredSelector({
  // 裁剪队列
  cutList: createSelector(
    ({ videoCut }: { videoCut: VideoCutInitialState }): Array<CutItem> => videoCut.cutList,
    (data: Array<CutItem>): Array<CutItem> => data
  ),
  // 裁剪线程
  cutChildList: createSelector(
    ({ videoCut }: { videoCut: VideoCutInitialState }): Array<WebWorkerChildItem> => videoCut.cutChildList,
    (data: Array<WebWorkerChildItem>): Array<WebWorkerChildItem> => data
  )
});

/* 视频快速裁剪 */
function Index(props: {}): ReactElement {
  const { cutList, cutChildList }: VideoCutInitialState = useSelector(selector);
  const dispatch: Dispatch = useDispatch();

  // 删除队列
  function handleDeleteClick(item: CutItem, event: MouseEvent<HTMLButtonElement>): void {
    dispatch(setCutListDelete(item));
  }

  // 停止裁剪
  function handleStopCutClick(record: CutItem, event: MouseEvent<HTMLButtonElement>): void {
    const index: number = cutChildList.findIndex((o: WebWorkerChildItem): boolean => o.id === record.id);

    if (index >= 0) {
      cutChildList[index].worker.postMessage({ type: 'stop' });
    }
  }

  // 开始裁剪
  async function handleStartCutClick(item: CutItem, event: MouseEvent<HTMLButtonElement>): Promise<void> {
    const result: SaveDialogReturnValue = await dialog.showSaveDialog({
      defaultPath: `[视频裁剪]${ item.id }.${ item.name }`
    });

    if (result.canceled || !result.filePath) return;

    const worker: Worker = new CutWorker();

    worker.addEventListener('message', function(event1: MessageEvent<MessageEventData>): void {
      const { type, error }: MessageEventData = event1.data;

      if (type === 'close' || type === 'error') {
        if (type === 'error') {
          message.error(`视频：${ item.name } 裁剪失败！`);
        }

        worker.terminate();
        dispatch(setCutChildListDelete(item));
      }
    }, false);

    worker.postMessage({
      type: 'start',
      playStreamPath: item.file,
      filePath: result.filePath,
      startTime: item.startTime,
      endTime: item.endTime,
      ffmpeg: getFFmpeg()
    });

    dispatch(setCutChildListAdd({
      id: item.id,
      worker
    }));
  }

  const columns: ColumnsType<CutItem> = [
    { title: '文件', dataIndex: 'name' },
    { title: '开始时间', dataIndex: 'startTime' },
    { title: '结束时间', dataIndex: 'endTime' },
    {
      title: '操作',
      key: 'handle',
      width: 175,
      render: (value: undefined, record: CutItem, index: number): ReactElement => {
        const idx: number = cutChildList.findIndex((o: WebWorkerChildItem): boolean => o.id === record.id);
        const hasChild: boolean = idx >= 0;

        return (
          <Button.Group>
            {
              hasChild ? (
                <Button type="primary"
                  danger={ true }
                  onClick={ (event: MouseEvent<HTMLButtonElement>): void => handleStopCutClick(record, event) }
                >
                  停止裁剪
                </Button>
              ) : (
                <Button onClick={ (event: MouseEvent<HTMLButtonElement>): Promise<void> => handleStartCutClick(record, event) }>
                  开始裁剪
                </Button>
              )
            }
            <Button type="primary"
              danger={ true }
              disabled={ hasChild }
              onClick={ (event: MouseEvent<HTMLButtonElement>): void => handleDeleteClick(record, event) }
            >
              删除
            </Button>
          </Button.Group>
        );
      }
    }
  ];

  return (
    <Fragment>
      <Header />
      <CutForm />
      <Table size="middle"
        columns={ columns }
        dataSource={ cutList }
        bordered={ true }
        rowKey="id"
        pagination={{
          showQuickJumper: true
        }}
      />
    </Fragment>
  );
}

export default Index;