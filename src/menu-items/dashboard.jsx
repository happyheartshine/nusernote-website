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
      url: '/ai?tab=soap'
    },
    {
      id: 'plans',
      title: '計画書',
      type: 'item',
      icon: 'ph ph-file-text',
      url: '/plans'
    },
    {
      id: 'ai',
      title: '報告書',
      type: 'item',
      icon: 'ph ph-user-circle-plus',
      url: '/ai?tab=records'
    },
    {
      id: 'calendar',
      title: 'カレンダー',
      type: 'item',
      icon: 'ph ph-calendar',
      url: '/calendar'
    }

  ]
};

export default dashboard;
