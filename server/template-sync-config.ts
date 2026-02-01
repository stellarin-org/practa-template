export const TEMPLATE_SYNC_CONFIG = {
  protectedPaths: [
    "client/my-practa",
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
};
