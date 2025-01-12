import { shell } from 'electron';
import { useState, useEffect, ReactElement, ReactNodeArray, Dispatch as D, SetStateAction as S, MouseEvent } from 'react';
import type { Dispatch } from 'redux';
import { useSelector, useDispatch } from 'react-redux';
import { createSelector, createStructuredSelector, Selector } from 'reselect';
import { Select, Button, Space, List, Alert, Avatar, Tag } from 'antd';
import style from './index.sass';
import Content from '../../components/Content/Content';
import Header from '../../components/Header/Header';
import WeiboLogin from '../../components/WeiboLogin/WeiboLogin';
import { idbCursorAccountList } from '../../components/WeiboLogin/reducers/weiboLogin';
import dbConfig from '../../utils/idb/dbConfig';
import weiboCheckIn from './weiboCheckIn';
import { setCheckIn, WeiboSuperInitialState } from './reducers/weiboSuper';
import type { WeiboLoginInitialState } from '../../components/WeiboLogin/reducers/weiboLogin';
import type { WeiboAccount } from '../../types';
import type { WeiboCheckinResult, Quantity } from './types';

/* redux selector */
type RSelector = WeiboLoginInitialState & WeiboSuperInitialState;

const selector: Selector<any, RSelector> = createStructuredSelector({
  // 微博已登陆账号
  accountList: createSelector(
    ({ weiboLogin }: { weiboLogin: WeiboLoginInitialState }): Array<WeiboAccount> => weiboLogin.accountList,
    (data: Array<WeiboAccount>): Array<WeiboAccount> => data
  ),
  // 登陆列表
  weiboCheckinList: createSelector(
    ({ weiboSuper }: { weiboSuper: WeiboSuperInitialState }): Array<WeiboCheckinResult> => weiboSuper.weiboCheckinList,
    (data: Array<WeiboCheckinResult>): Array<WeiboCheckinResult> => data
  ),
  // 签到状态
  checkIn: createSelector(
    ({ weiboSuper }: { weiboSuper: WeiboSuperInitialState }): boolean => weiboSuper.checkIn,
    (data: boolean): boolean => data
  ),
  // 已签到
  quantity:
    createSelector(
      ({ weiboSuper }: { weiboSuper: WeiboSuperInitialState }): Quantity => weiboSuper.quantity,
      (data: Quantity): Quantity => data
    )
});

/* 微博超话签到 */
function Index(props: {}): ReactElement {
  const { accountList, weiboCheckinList, checkIn, quantity }: RSelector = useSelector(selector);
  const dispatch: Dispatch = useDispatch();
  const [accountValue, setAccountValue]: [string | undefined, D<S<string | undefined>>] = useState(undefined);

  // 打开超话
  function handleOpenTopicLinkClick(link: string, event: MouseEvent<HTMLAnchorElement>): void {
    shell.openExternal(`https:${ link }`);
  }

  // 开始签到
  function handleWeiboCheckinStartClick(event: MouseEvent<HTMLButtonElement>): void {
    const index: number = accountList.findIndex((o: WeiboAccount): boolean => o.id === accountValue);

    if (index >= 0) {
      dispatch(setCheckIn(true));
      weiboCheckIn(accountList[index].cookie);
    }
  }

  // 停止签到
  function handleWeiboCheckinStopClick(event: MouseEvent<HTMLButtonElement>): void {
    dispatch(setCheckIn(false));
  }

  // 渲染select
  function accountSelectRender(): ReactNodeArray {
    return accountList.map((item: WeiboAccount, index: number): ReactElement => {
      return <Select.Option key={ item.id } value={ item.id }>{ item.username }</Select.Option>;
    });
  }

  // 渲染已签到列表
  function weiboCheckinListRender(item: WeiboCheckinResult): ReactElement {
    return (
      <List.Item key={ item.superId }>
        <List.Item.Meta avatar={ <Avatar src={ item.pic } /> }
          title={
            <a role="button"
              aria-label="打开超话"
              onClick={ (event: MouseEvent<HTMLAnchorElement>): void => handleOpenTopicLinkClick(item.link, event) }
            >
              { item.title }
            </a>
          }
          description={ <div className={ style.description }>{ item.content1 }</div> }
        />
        <Tag color={ item.code === 100000 ? '#87d068' : '#f50' }>{ item.result }</Tag>
      </List.Item>
    );
  }

  useEffect(function(): void {
    dispatch(idbCursorAccountList({
      query: {
        indexName: dbConfig.objectStore[3].data[0]
      }
    }));
  }, []);

  return (
    <Content>
      <Header>
        <Space>
          <Select className={ style.accountSelect }
            value={ accountValue }
            disabled={ checkIn }
            onSelect={ (value: string): void => setAccountValue(value) }
          >
            { accountSelectRender() }
          </Select>
          {
            checkIn ? <Button type="primary" danger={ true } onClick={ handleWeiboCheckinStopClick }>停止签到</Button> : (
              <Button type="primary" disabled={ accountValue === undefined } onClick={ handleWeiboCheckinStartClick }>
                超话签到
              </Button>
            )
          }
          <WeiboLogin />
        </Space>
      </Header>
      <Alert type="warning" message={ `已签到超话：${ quantity.checkedInLen }` } />
      <List size="small" dataSource={ weiboCheckinList } renderItem={ weiboCheckinListRender } />
    </Content>
  );
}

export default Index;