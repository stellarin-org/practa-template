export const TEMPLATE_SYNC_CONFIG = {
  protectedPaths: [
    "client/my-practa",
    "practa.config.json",
  ],

  skipPatterns: [
    ".git/",
    "node_modules/",
    ".template-update-temp/",
    "client/lib/practa-assets.ts",
  ],

  syncDirectories: [
    "assets",
    "client",
    "demo-template",
    "docs",
    "scripts",
    "server",
    "shared",
  ],

  // Individual files to ensure are synced (in addition to syncDirectories)
  syncFiles: [
    "server/cdn-routes.ts",
  ],
};
