import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/e2e',timeout:60_000,workers:1,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://localhost:5183',trace:'retain-on-failure',screenshot:'only-on-failure',launchOptions:{channel:'chrome'}},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
 webServer:[
  {command:'pnpm --filter @torbat/api exec tsx test/e2e-server.ts',url:'http://127.0.0.1:4010/health',reuseExistingServer:false,timeout:60_000},
  {command:'pnpm --filter @torbat/citizen-web exec vite --port 5183 --strictPort',url:'http://localhost:5183',env:{API_TARGET:'http://127.0.0.1:4010'},reuseExistingServer:false,timeout:60_000}
 ]
});
