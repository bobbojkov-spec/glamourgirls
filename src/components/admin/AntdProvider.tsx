'use client';

import { ConfigProvider, App } from 'antd';
import { ReactNode } from 'react';

export default function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1890ff', // Ant Design default blue
          borderRadius: 6,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
          fontSize: 14,
          // Typography tokens
          fontSizeHeading1: 38,
          fontSizeHeading2: 30,
          fontSizeHeading3: 24,
          fontSizeHeading4: 20,
          fontSizeHeading5: 16,
          fontSizeLG: 16,
          fontSizeSM: 12,
          fontSizeXL: 20,
          // Line heights
          lineHeight: 1.5715,
          lineHeightHeading1: 1.21,
          lineHeightHeading2: 1.35,
          lineHeightHeading3: 1.4,
          lineHeightHeading4: 1.5,
          lineHeightHeading5: 1.5,
        },
        components: {
          Table: {
            fontSize: 14,
            headerBg: '#fafafa',
            headerColor: '#595959',
            headerSortActiveBg: '#f5f5f5',
            headerSortHoverBg: '#f0f0f0',
            rowHoverBg: '#fafafa',
          },
          Typography: {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
          },
          Button: {
            fontSize: 14,
            fontWeight: 500,
          },
          Input: {
            fontSize: 14,
          },
          Radio: {
            fontSize: 14,
          },
        },
      }}
    >
      <App>
        {children}
      </App>
    </ConfigProvider>
  );
}

