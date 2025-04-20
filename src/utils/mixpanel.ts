import mixpanel from 'mixpanel-browser';

declare global {
  interface ImportMetaEnv {
    readonly VITE_MIXPANEL_TOKEN: string;
  }
  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// Initialize Mixpanel with your public Project Token
mixpanel.init(import.meta.env.VITE_MIXPANEL_TOKEN, {
  debug: import.meta.env.DEV,      // enable verbose logging in development
});

// Optional: identify anonymous users if you like
// mixpanel.identify('ANONYMOUS_ID');

export default mixpanel;