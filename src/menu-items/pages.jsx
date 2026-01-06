// ==============================|| MENU ITEMS - PAGES ||============================== //

const pages = {
  id: 'pages',
  title: 'ページ',
  type: 'group',
  children: [
    {
      id: 'profile',
      title: 'プロフィール',
      type: 'item',
      icon: 'ph ph-user',
      url: '/profile'
    },
    {
      id: 'login',
      title: 'ログイン',
      type: 'item',
      icon: 'ph ph-lock-key',
      url: '/login',
      target: true
    },
    {
      id: 'register',
      title: '登録',
      type: 'item',
      icon: 'ph ph-user-circle-plus',
      url: '/register',
      target: true
    }
  ]
};

export default pages;
