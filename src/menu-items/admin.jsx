// icons
const icons = {
  IconUsers: 'ti ti-users',
  IconUserCheck: 'ti ti-user-check'
};

// ==============================|| MENU ITEMS - ADMIN ||============================== //

const admin = {
  id: 'admin',
  title: '管理',
  type: 'group',
  children: [
    {
      id: 'admin-approvals',
      title: '承認待ちユーザー',
      type: 'item',
      url: '/admin/approvals',
      icon: icons.IconUserCheck,
      breadcrumbs: false,
      adminOnly: true
    },
    {
      id: 'admin-users',
      title: 'ユーザー管理',
      type: 'item',
      url: '/admin/users',
      icon: icons.IconUsers,
      breadcrumbs: false,
      adminOnly: true
    }
  ]
};

export default admin;
