import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: 'Unlingo',
    },
    links: [
      {
        text: 'Home',
        url: '/',
      },
    ],
  };
}
