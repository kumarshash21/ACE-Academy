
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
basePath: process.env.NEXT_PUBLIC_BASE_PATH || '/ace_academy',
// `next dev`'s cross-origin protection only trusts "localhost" by default,
// so browsing the dev server via a loopback alias like 127.0.0.1/127.0.2.2
// gets its HMR websocket (and other same-origin requests) rejected with a
// 403 — which aborts Turbopack's client bootstrap before React ever
// hydrates, leaving every page blank. This does not affect `next start`.
allowedDevOrigins: ['127.0.0.1', '127.0.2.2'],
};

export default nextConfig;
