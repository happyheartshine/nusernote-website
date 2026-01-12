// ==============================|| MENU ITEMS - DASHBOARD ||============================== //

const dashboard = {
  id: 'navigation',
  title: 'ダッシュボード',
  type: 'group',
  children: [
    {
      id: 'dashboard',
      title: 'ダッシュボード',
      type: 'item',
      icon: 'ph ph-house-line',
      url: '/dashboard/default'
    },
    {
      id: 'patients',
      title: '利用者基本情報',
      type: 'item',
      icon: 'ph ph-user',
      url: '/patients'
    },
    {
      id: 'visit-records',
      title: '訪問記録',
      type: 'item',
      icon: 'ph ph-notebook',
      url: '/visit-records'
    },
    {
      id: 'ai',
      title: '計画書',
      type: 'item',
      icon: 'ph ph-user-circle-plus',
      url: '/ai'
    }
    //,
    // {
    //   id: 'main-disease',
    //   title: '主疾患',
    //   type: 'item',
    //   icon: 'ph ph-heartbeat',
    //   url: '/main-disease'
    // }
  ]
};

export default dashboard;
