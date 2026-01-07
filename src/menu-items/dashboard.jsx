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
      id: 'ai',
      title: 'AI記録支援',
      type: 'item',
      icon: 'ph ph-robot',
      url: '/ai'
    },
    {
      id: 'patients',
      title: '患者',
      type: 'item',
      icon: 'ph ph-user',
      url: '/patients'
    },
    {
      id: 'main-disease',
      title: '主疾患',
      type: 'item',
      icon: 'ph ph-heartbeat',
      url: '/main-disease'
    }
  ]
};

export default dashboard;
