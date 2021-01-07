import { promises as fsP } from 'fs';
import { remote, SaveDialogReturnValue } from 'electron';
import { Fragment, useState, ReactElement, Dispatch as D, SetStateAction as S, MouseEvent } from 'react';
import type { Dispatch } from 'redux';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector, createStructuredSelector, Selector } from 'reselect';
import { Select, Button, Table, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { findIndex } from 'lodash-es';
import FFMpegDownloadWorker from 'worker-loader!../../../../utils/worker/FFMpegDownload.Worker';
import style from './inVideo.sass';
import Header from '../../../../components/Header/Header';
import {
  setInVideoQuery,
  setInVideoList,
  Live48InitialState,
  setVideoListChildAdd,
  setVideoListChildDelete
} from '../../reducers/live48';
import { parseInVideoUrl, parseVideoItem } from '../parseLive48Website';
import { requestDownloadFile } from '../../services/pocket48';
import { getFFmpeg } from '../../../../utils/utils';
import type { MessageEventData } from '../../../../types';
import type { InVideoQuery, InVideoItem, InVideoWebWorkerItem } from '../../types';

/**
 * 格式化m3u8文件内视频的地址
 * @param { string } data: m3u8文件内容
 * @param { string } m3u8Url: m3u8文件的路径
 */
function formatTsUrl(data: string, m3u8Url: string): string {
  const dataArr: string[] = data.split('\n');
  const newStrArr: string[] = [];

  // m3u8文件所在的文件夹
  const m3u8Pathname: string = m3u8Url.split(/\?/)[0].replace(/\/[^/]+$/, '');

  for (const item of dataArr) {
    if (/^#/.test(item) || item === '') {
      newStrArr.push(item);
    } else if (/^\//.test(item)) {
      newStrArr.push(`https://ts.48.cn/${ item }`);
    } else {
      newStrArr.push(`${ m3u8Pathname }/${ item }`);
    }
  }

  return newStrArr.join('\n');
}

/* state */
type RSelector = Pick<Live48InitialState, 'inVideoQuery' | 'inVideoList' | 'videoListChild'>;

const state: Selector<any, RSelector> = createStructuredSelector({
  // 查询条件
  inVideoQuery: createSelector(
    ({ live48 }: { live48: Live48InitialState }): InVideoQuery | undefined => live48?.inVideoQuery,
    (data: InVideoQuery): InVideoQuery | undefined => data
  ),
  // 录播列表
  inVideoList: createSelector(
    ({ live48 }: { live48: Live48InitialState }): Array<InVideoItem> => live48.inVideoList,
    (data: Array<InVideoItem>): Array<InVideoItem> => data
  ),
  // 正在下载
  videoListChild: createSelector(
    ({ live48 }: { live48: Live48InitialState }): Array<InVideoWebWorkerItem> => live48.videoListChild,
    (data: Array<InVideoWebWorkerItem>): Array<InVideoWebWorkerItem> => data
  )
});

/* 录播下载 */
function InVideo(props: {}): ReactElement {
  const { inVideoQuery, inVideoList, videoListChild }: RSelector = useSelector(state);
  const dispatch: Dispatch = useDispatch();
  const [loading, setLoading]: [boolean, D<S<boolean>>] = useState(false);

  // 停止下载
  function handleStopClick(record: InVideoItem, event: MouseEvent<HTMLButtonElement>): void {
    const index: number = findIndex(videoListChild, { id: record.id, liveType: record.liveType });

    if (index >= 0) {
      videoListChild[index].worker.postMessage({ type: 'stop' });
    }
  }

  // 开始下载
  async function handleDownloadClick(record: InVideoItem, quality: string, event: MouseEvent<HTMLButtonElement>): Promise<void> {
    try {
      const m3u8Url: string | null = await parseVideoItem(record, quality);

      if (!m3u8Url) {
        return message.warn('视频不存在！');
      }

      const result: SaveDialogReturnValue = await remote.dialog.showSaveDialog({
        defaultPath: `[公演录播]${ record.liveType }_${ record.id }_${ quality }.ts`
      });

      if (result.canceled || !result.filePath) return;

      const m3u8File: string = `${ result.filePath }.m3u8`;
      const m3u8Data: string = await requestDownloadFile(m3u8Url);

      await fsP.writeFile(m3u8File, formatTsUrl(m3u8Data, m3u8Url));

      const worker: Worker = new FFMpegDownloadWorker();

      worker.addEventListener('message', function(event: MessageEvent<MessageEventData>) {
        const { type, error }: MessageEventData = event.data;

        if (type === 'close' || type === 'error') {
          if (type === 'error') {
            message.error(`视频：${ record.title } 下载失败！`);
          }

          worker.terminate();
          dispatch(setVideoListChildDelete(record));
        }
      }, false);

      worker.postMessage({
        type: 'start',
        playStreamPath: m3u8File,
        filePath: result.filePath,
        ffmpeg: getFFmpeg(),
        protocolWhitelist: true
      });

      dispatch(setVideoListChildAdd({
        id: record.id,
        liveType: record.liveType,
        worker
      }));
    } catch (err) {
      console.error(err);
      message.error('下载失败！');
    }
  }

  // 查询
  function handleLiveTypeSelect(value: string): void {
    dispatch(setInVideoQuery({
      liveType: value
    }));
  }

  // 页码变化
  async function handlePageChange(page: number, pageSize: number): Promise<void> {
    setLoading(true);

    try {
      const res: {
        data: Array<InVideoItem>;
        total: number;
      } = await parseInVideoUrl(inVideoQuery, page);

      dispatch(setInVideoList({
        data: res.data,
        page,
        total: res.total
      }));
    } catch (err) {
      console.error(err);
      message.error('录播加载失败！');
    }

    setLoading(false);
  }

  // 解析并加载列表
  async function handleGetVideoListClick(event: MouseEvent<HTMLButtonElement>): Promise<void> {
    setLoading(true);

    try {
      const res: {
        data: Array<InVideoItem>;
        total: number;
      } = await parseInVideoUrl(inVideoQuery, 1);

      dispatch(setInVideoList({
        data: res.data,
        page: 1,
        total: res.total
      }));
    } catch (err) {
      console.error(err);
      message.error('录播加载失败！');
    }

    setLoading(false);
  }

  const columns: ColumnsType<InVideoItem> = [
    { title: '标题', dataIndex: 'title' },
    {
      title: '操作',
      key: 'handle',
      width: 210,
      render: (value: undefined, record: InVideoItem, index: number): ReactElement => {
        const idx: number = findIndex(videoListChild, {
          id: record.id,
          liveType: record.liveType
        });

        return idx >= 0 ? (
          <Button type="primary"
            danger={ true }
            onClick={ (event: MouseEvent<HTMLButtonElement>): void => handleStopClick(record, event) }
          >
            停止下载
          </Button>
        ) : (
          <Button.Group>
            <Button onClick={
              (event: MouseEvent<HTMLButtonElement>): Promise<void> => handleDownloadClick(record, 'chao', event) }
            >
              超清
            </Button>
            <Button onClick={
              (event: MouseEvent<HTMLButtonElement>): Promise<void> => handleDownloadClick(record, 'gao', event) }
            >
              高清
            </Button>
            <Button onClick={
              (event: MouseEvent<HTMLButtonElement>): Promise<void> => handleDownloadClick(record, 'liuchang', event) }
            >
              流畅
            </Button>
          </Button.Group>
        );
      }
    }
  ];

  return (
    <Fragment>
      <Header>
        <Select className={ style.typeSelect } value={ inVideoQuery?.liveType } onSelect={ handleLiveTypeSelect }>
          <Select.Option value="snh48">SNH48</Select.Option>
          <Select.Option value="bej48">BEJ48</Select.Option>
          <Select.Option value="gnz48">GNZ48</Select.Option>
          <Select.Option value="ckg48">CKG48</Select.Option>
        </Select>
        <Button type="primary" disabled={ inVideoQuery === undefined } onClick={ handleGetVideoListClick }>加载录播</Button>
      </Header>
      <Table size="middle"
        columns={ columns }
        dataSource={ inVideoList }
        bordered={ true }
        loading={ loading }
        rowKey="id"
        pagination={{
          showQuickJumper: true,
          showSizeChanger: false,
          pageSize: 15,
          total: inVideoQuery?.total ?? 0,
          current: inVideoQuery?.page ?? 1,
          onChange: handlePageChange
        }}
      />
    </Fragment>
  );
}

export default InVideo;