const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
    output: 'export',
    basePath: isProd ? '/ValidationPipeline' : '',
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
