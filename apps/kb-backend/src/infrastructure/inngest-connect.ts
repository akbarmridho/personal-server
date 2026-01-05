import { connect } from "inngest/connect";
import { env } from "./env.js";
import { inngest } from "./inngest.js";
import { inngestFunctions } from "./inngest-functions.js";

export const inngestConnect = async () => {
  return await connect({
    apps: [{ client: inngest, functions: inngestFunctions }],
    instanceId: "kb-backend",
    maxWorkerConcurrency: 20,
    rewriteGatewayEndpoint: (url) => {
      const clusterUrl = new URL(url);
      clusterUrl.host = "localhost:8289";
      return clusterUrl.toString();
    },
    signingKey: env.INNGEST_SIGNING_KEY,
    streaming: "force",
    serveHost: "host.docker.internal:3010",
  });
};
