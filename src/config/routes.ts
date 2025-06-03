export const routes = {
  home: '/home',
  spbooks: '/spbooks',
  spletters: '/spletters',
  default: '/home',
  external: {
    spbooks: 'https://notebooklm.google.com/notebook/3ce18730-fc6c-40a0-bc93-1cb531521b7f',
    spletters: 'https://notebooklm.google.com/notebook/7a13c623-df4b-440b-b10f-2407c3ab8b6a'
  }
} as const;

// Helper function to get redirect URL
export const getRedirectUrl = (path: string = routes.default): string => {
  return path;
}; 
