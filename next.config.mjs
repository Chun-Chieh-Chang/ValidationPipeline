const nextConfig = {
    output: 'export',
    basePath: process.env.NODE_ENV === 'production' ? '/ValidationPipeline' : '',
    images: {
        unoptimized: true,
    },
};

export default nextConfig;
