import type { TripData } from '../types/trip';
import { TRIP_DATA_VERSION } from '../types/trip';
import { getDefaultTripConfig } from './tripConfigs';

/**
 * 根据仓库根目录「计划.md」整理的初始坐标（GCJ-02，与高德一致）。
 * id 固定，便于日后脚本迁移。
 */
export function getPlanTripSeed(): TripData {
  return getDefaultTripConfig().data;
}

export function getLegacyPlanTripSeed(): TripData {
  const gHotel = 'a1000001-0000-4000-8000-000000000001';
  const g52 = 'a1000001-0000-4000-8000-000000000002';
  const g53 = 'a1000001-0000-4000-8000-000000000003';
  const g54 = 'a1000001-0000-4000-8000-000000000004';
  const g55 = 'a1000001-0000-4000-8000-000000000005';
  const g56 = 'a1000001-0000-4000-8000-000000000006';
  const gExtra = 'a1000001-0000-4000-8000-000000000007';

  const p = {
    hotel: 'b2000001-0000-4000-8000-000000000001',
    pier: 'b2000001-0000-4000-8000-000000000002',
    leifeng: 'b2000001-0000-4000-8000-000000000003',
    changqiao: 'b2000001-0000-4000-8000-000000000004',
    jingci: 'b2000001-0000-4000-8000-000000000005',
    liulang: 'b2000001-0000-4000-8000-000000000006',
    wuzhen: 'b2000001-0000-4000-8000-000000000007',
    shanghai: 'b2000001-0000-4000-8000-000000000008',
    hzEast: 'b2000001-0000-4000-8000-000000000009',
    sxNorth: 'b2000001-0000-4000-8000-000000000010',
    luxun: 'b2000001-0000-4000-8000-000000000011',
    cangqiao: 'b2000001-0000-4000-8000-000000000012',
    shenyuan: 'b2000001-0000-4000-8000-000000000013',
    hzWest: 'b2000001-0000-4000-8000-000000000014',
    qdhLakeSt: 'b2000001-0000-4000-8000-000000000015',
    qdhWharf: 'b2000001-0000-4000-8000-000000000016',
    hzMuseum: 'b2000001-0000-4000-8000-000000000017',
    hefang: 'b2000001-0000-4000-8000-000000000018',
    airport: 'b2000001-0000-4000-8000-000000000019',
    gongchen: 'b2000001-0000-4000-8000-000000000020',
    wulin: 'b2000001-0000-4000-8000-000000000021',
    xixi: 'b2000001-0000-4000-8000-000000000022',
    westLakeNight: 'b2000001-0000-4000-8000-000000000023',
    musicFountain: 'b2000001-0000-4000-8000-000000000024',
    drumNight: 'b2000001-0000-4000-8000-000000000025',
    chenghuang: 'b2000001-0000-4000-8000-000000000026',
    zjMuseum: 'b2000001-0000-4000-8000-000000000027',
  } as const;

  const places: TripData['places'] = {
    [p.hotel]: {
      id: p.hotel,
      name: '锦江之星品尚·西湖大道南宋御街店',
      address: '上城区中山中路196号（南宋御街内）',
      lat: 30.2438,
      lng: 120.1694,
      note: '定安路地铁站约 250m',
      pinned: true,
    },
    [p.pier]: {
      id: p.pier,
      name: '西湖游船（钱王祠码头一带）',
      lat: 30.2466,
      lng: 120.1484,
      note: '计划：三潭印月游船 + 小瀛洲上岛',
    },
    [p.leifeng]: {
      id: p.leifeng,
      name: '雷峰塔景区',
      lat: 30.2315,
      lng: 120.1486,
      note: '门票：西湖旅游公众号',
    },
    [p.changqiao]: {
      id: p.changqiao,
      name: '长桥公园',
      lat: 30.2285,
      lng: 120.1496,
      note: '雷峰塔→长桥公园→净寺→柳浪闻莺',
    },
    [p.jingci]: {
      id: p.jingci,
      name: '净慈寺（净寺）',
      lat: 30.2298,
      lng: 120.1487,
      note: '',
    },
    [p.liulang]: {
      id: p.liulang,
      name: '柳浪闻莺',
      lat: 30.2418,
      lng: 120.1554,
      note: '',
    },
    [p.wuzhen]: {
      id: p.wuzhen,
      name: '乌镇·西栅',
      lat: 30.7483,
      lng: 120.4889,
      note: '若与上海行程冲突则二选一',
    },
    [p.shanghai]: {
      id: p.shanghai,
      name: '上海·梅赛德斯奔驰文化中心（参考）',
      lat: 31.1894,
      lng: 121.4968,
      note: '明日方舟音律联觉，抢票成功再去',
    },
    [p.hzEast]: {
      id: p.hzEast,
      name: '杭州东站',
      lat: 30.2908,
      lng: 120.2099,
      note: '高铁出发',
    },
    [p.sxNorth]: {
      id: p.sxNorth,
      name: '绍兴北站',
      lat: 30.0996,
      lng: 120.5969,
      note: '',
    },
    [p.luxun]: {
      id: p.luxun,
      name: '鲁迅故里（祖居/故居/百草园/三味书屋/纪念馆）',
      lat: 29.9967,
      lng: 120.5856,
      note: '按游览顺序步行串联',
    },
    [p.cangqiao]: {
      id: p.cangqiao,
      name: '仓桥直街',
      lat: 30.0033,
      lng: 120.5794,
      note: '',
    },
    [p.shenyuan]: {
      id: p.shenyuan,
      name: '沈园',
      lat: 29.9976,
      lng: 120.5917,
      note: '乌篷船',
    },
    [p.hzWest]: {
      id: p.hzWest,
      name: '杭州西站',
      lat: 30.3439,
      lng: 119.9629,
      note: '',
    },
    [p.qdhLakeSt]: {
      id: p.qdhLakeSt,
      name: '千岛湖站',
      lat: 29.6109,
      lng: 119.0496,
      note: '',
    },
    [p.qdhWharf]: {
      id: p.qdhWharf,
      name: '千岛湖·中心湖区旅游码头',
      lat: 29.6145,
      lng: 119.0582,
      note: '到站后乘接驳，细则再查',
    },
    [p.hzMuseum]: {
      id: p.hzMuseum,
      name: '杭州博物馆',
      lat: 30.2519,
      lng: 120.1713,
      note: '公众号预约',
    },
    [p.hefang]: {
      id: p.hefang,
      name: '河坊街',
      lat: 30.2464,
      lng: 120.1695,
      note: '可与南宋御街连片逛',
    },
    [p.airport]: {
      id: p.airport,
      name: '杭州萧山国际机场 T3',
      lat: 30.2294,
      lng: 120.4344,
      note: '计划返程机场',
    },
    [p.gongchen]: {
      id: p.gongchen,
      name: '拱宸桥（京杭大运河）',
      lat: 30.3188,
      lng: 120.1433,
      note: '备选',
    },
    [p.wulin]: {
      id: p.wulin,
      name: '武林广场 / 武林夜市',
      lat: 30.2765,
      lng: 120.1642,
      note: '备选',
    },
    [p.xixi]: {
      id: p.xixi,
      name: '西溪国家湿地公园',
      lat: 30.2724,
      lng: 120.0653,
      note: '备选',
    },
    [p.westLakeNight]: {
      id: p.westLakeNight,
      name: '西湖夜游（湖滨上船参考点）',
      lat: 30.2547,
      lng: 120.1588,
      note: '18:00+ 官方游船',
    },
    [p.musicFountain]: {
      id: p.musicFountain,
      name: '西湖湖滨音乐喷泉',
      lat: 30.2549,
      lng: 120.1591,
      note: '',
    },
    [p.drumNight]: {
      id: p.drumNight,
      name: '鼓楼 · 十五奎巷（夜景）',
      lat: 30.2439,
      lng: 120.1728,
      note: '河坊街+南宋御街+鼓楼',
    },
    [p.chenghuang]: {
      id: p.chenghuang,
      name: '吴山 · 城隍阁（夜景）',
      lat: 30.2468,
      lng: 120.1699,
      note: '',
    },
    [p.zjMuseum]: {
      id: p.zjMuseum,
      name: '浙江省博物馆（之江馆区）',
      address: '西湖区之江文化中心',
      lat: 30.157,
      lng: 120.087,
      note: '备选；公众号预约',
    },
  };

  return {
    version: TRIP_DATA_VERSION,
    activeGroupId: g52,
    groups: [
      { id: gHotel, title: '住宿', placeIds: [p.hotel] },
      {
        id: g52,
        title: '5月2日·西湖',
        placeIds: [p.pier, p.leifeng, p.changqiao, p.jingci, p.liulang],
      },
      { id: g53, title: '5月3日·乌镇/沪', placeIds: [p.wuzhen, p.shanghai] },
      {
        id: g54,
        title: '5月4日·绍兴',
        placeIds: [p.hzEast, p.sxNorth, p.luxun, p.cangqiao, p.shenyuan],
      },
      {
        id: g55,
        title: '5月5日·千岛湖',
        placeIds: [p.hzWest, p.qdhLakeSt, p.qdhWharf],
      },
      {
        id: g56,
        title: '5月6日·返程',
        placeIds: [p.hzMuseum, p.hefang, p.airport],
      },
      {
        id: gExtra,
        title: '备选/夜游',
        placeIds: [
          p.gongchen,
          p.wulin,
          p.zjMuseum,
          p.xixi,
          p.westLakeNight,
          p.musicFountain,
          p.drumNight,
          p.chenghuang,
        ],
      },
    ],
    places,
  };
}
