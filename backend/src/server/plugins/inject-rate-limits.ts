import fp from "fastify-plugin";

import { getRateLimiterConfig } from "@app/ee/services/rate-limit/rate-limit-service";
import { getConfig } from "@app/lib/config/env";

export const injectRateLimits = fp(async (server) => {
  server.decorateRequest("rateLimits", null);
  server.addHook("onRequest", async (req) => {
    const appCfg = getConfig();

    const instanceRateLimiterConfig = getRateLimiterConfig();
    if (!req.auth) {
      // for public endpoints, we always use the instance-wide default rate limits
      req.rateLimits = instanceRateLimiterConfig;
      return;
    }

    const plan = await server.services.license.getPlan(req.auth.orgId);
    const { rateLimits } = plan;

    if (plan.customRateLimits && !appCfg.isCloud) {
      // we do this because for self-hosted/dedicated instances, we want custom rate limits to be based on admin configuration
      // note that the syncing of custom rate limit happens on the instanceRateLimiterConfig object
      req.rateLimits = instanceRateLimiterConfig;
      return;
    }

    // we're using the null coalescing operator in order to handle outdated licenses
    req.rateLimits = {
      readLimit: rateLimits?.readLimit ?? instanceRateLimiterConfig.readLimit,
      publicEndpointLimit: rateLimits?.publicEndpointLimit ?? instanceRateLimiterConfig.publicEndpointLimit,
      writeLimit: rateLimits?.writeLimit ?? instanceRateLimiterConfig.writeLimit,
      secretsLimit: rateLimits?.secretsLimit ?? instanceRateLimiterConfig.secretsLimit,
      authRateLimit: rateLimits?.authRateLimit ?? instanceRateLimiterConfig.authRateLimit,
      inviteUserRateLimit: rateLimits?.inviteUserRateLimit ?? instanceRateLimiterConfig.inviteUserRateLimit,
      mfaRateLimit: rateLimits?.mfaRateLimit ?? instanceRateLimiterConfig.mfaRateLimit,
      creationLimit: rateLimits?.creationLimit ?? instanceRateLimiterConfig.creationLimit
    };
  });
});
