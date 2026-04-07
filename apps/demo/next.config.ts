import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    experimental: {
        externalDir: true,
    },
    webpack: (config) => {
        config.resolve.extensionAlias = {
            ...config.resolve.extensionAlias,
            ".js": [".ts", ".tsx", ".js"],
            ".jsx": [".tsx", ".jsx"],
        };

        return config;
    },
};

export default nextConfig;
