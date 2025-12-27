import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // 開発モードのインジケーターを非表示にする
  devIndicators: {
    position: 'bottom-right',
  },
};

export default nextConfig;
