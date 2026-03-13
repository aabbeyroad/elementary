import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // React Compiler (main에서 가져옴)
  reactCompiler: true,
  // 실험적 최적화
  experimental: {
    // 서버 컴포넌트의 외부 패키지 최적화
    optimizePackageImports: ['lucide-react', 'date-fns'],
  },
};

export default nextConfig;
