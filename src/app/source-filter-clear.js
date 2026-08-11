'use client';

import { useEffect } from 'react';

export default function SourceFilterClear() {
  useEffect(() => {
    const addButton = () => {
      const filters = document.querySelector('.sourceFilters');
      if (!filters || filters.querySelector('.clearSourceFilters')) return false;
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'clearSourceFilters'; button.textContent = 'Clear filters';
      button.addEventListener('click', () => {
        filters.querySelectorAll('input').forEach((input) => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); });
        filters.querySelectorAll('select').forEach((select) => { select.value = 'all'; select.dispatchEvent(new Event('change', { bubbles: true })); });
      });
      filters.appendChild(button);
      return true;
    };
    const observer = new MutationObserver(() => addButton() && observer.disconnect());
    observer.observe(document.body, { childList: true, subtree: true }); addButton();
    return () => observer.disconnect();
  }, []);
  return null;
}
