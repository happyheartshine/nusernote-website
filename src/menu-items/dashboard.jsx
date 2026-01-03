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
    }
  ]
};

export default dashboard;
