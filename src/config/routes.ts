export const routes = {
  home: '/home',
  spllm: '/spllm',
  default: '/home',
  external: {
    spllm: 'https://notebooklm.google.com/notebook/3ce18730-fc6c-40a0-bc93-1cb531521b7f'  // www.iskcondeoghar.in/spllm redirects to this URL
  }
} as const;

// Helper function to get redirect URL
export const getRedirectUrl = (path: string = routes.default): string => {
  return path;
}; 