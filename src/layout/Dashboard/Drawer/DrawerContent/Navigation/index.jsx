'use client';

import PropTypes from 'prop-types';

import { useState } from 'react';

// project imports
import NavItem from './NavItem';
import NavGroup from './NavGroup';
import menuItems from '@/menu-items';
import { useAuthProfile } from '@/hooks/useAuthProfile';

// ==============================|| NAVIGATION ||============================== //

export default function Navigation({ selectedItems, setSelectedItems, setSelectTab }) {
  const [selectedID, setSelectedID] = useState('');
  const [selectedLevel, setSelectedLevel] = useState(0);
  const { profile } = useAuthProfile();

  const lastItem = null;
  let lastItemIndex = menuItems.items.length - 1;
  let remItems = [];
  let lastItemId;

  if (lastItem && lastItem < menuItems.items.length) {
    lastItemId = menuItems.items[lastItem - 1].id;
    lastItemIndex = lastItem - 1;
    remItems = menuItems.items.slice(lastItem - 1, menuItems.items.length).map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      elements: item.children,
      icon: item.icon,
      ...(item.url && {
        url: item.url
      })
    }));
  }

  const filterMenuItems = (items) => {
    if (!profile) return items;

    return items
      .map((item) => {
        if (item.children) {
          const filteredChildren = item.children.filter((child) => {
            if (child.adminOnly && profile.role !== 'admin') {
              return false;
            }
            return true;
          });

          if (filteredChildren.length === 0) {
            return null;
          }

          return {
            ...item,
            children: filteredChildren
          };
        }
        return item;
      })
      .filter((item) => item !== null);
  };

  const filteredMenuItems = filterMenuItems(menuItems.items.slice(0, lastItemIndex + 1));

  const navGroups = filteredMenuItems.map((item, index) => {
    switch (item.type) {
      case 'group':
        if (item.url && item.id !== lastItemId) {
          return (
            <>
              <li key={index}>
                <NavItem item={item} level={1} isParents />
              </li>
            </>
          );
        }

        return (
          <NavGroup
            key={item.id}
            setSelectedID={setSelectedID}
            setSelectedItems={setSelectedItems}
            setSelectedLevel={setSelectedLevel}
            selectedLevel={selectedLevel}
            selectedID={selectedID}
            selectedItems={selectedItems}
            lastItem={lastItem}
            remItems={remItems}
            lastItemId={lastItemId}
            item={item}
            setSelectTab={setSelectTab ?? (() => {})}
          />
        );
      default:
        return (
          <h6 key={item.id} color="error" className="align-items-center">
            Fix - Navigation Group
          </h6>
        );
    }
  });

  return <ul className="pc-navbar d-block">{navGroups}</ul>;
}

Navigation.propTypes = {
  selectedItems: PropTypes.any,
  setSelectedItems: PropTypes.oneOfType([PropTypes.any, PropTypes.func]),
  setSelectTab: PropTypes.oneOfType([PropTypes.any, PropTypes.func])
};
