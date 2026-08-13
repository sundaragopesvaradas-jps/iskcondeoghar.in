/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/home',
        permanent: false,
      },
      {
        source: '/spbooks',
        destination:
          'https://notebooklm.google.com/notebook/3ce18730-fc6c-40a0-bc93-1cb531521b7f',
        permanent: false,
      },
      {
        source: '/spletters',
        destination:
          'https://notebooklm.google.com/notebook/7a13c623-df4b-440b-b10f-2407c3ab8b6a',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
