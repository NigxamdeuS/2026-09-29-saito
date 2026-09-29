import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server is bound to 0.0.0.0, so the page origin 127.0.0.1 is not
  // the bind host. Without this, the HMR socket is rejected and the app
  // never leaves the server-rendered shell.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    serverActions: {
      // Contact form attachments: up to 5MB of text files plus multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
