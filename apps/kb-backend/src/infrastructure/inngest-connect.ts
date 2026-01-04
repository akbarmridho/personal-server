import { connect } from "inngest/connect";
import { inngest } from "./inngest.js";
import { inngestFunctions } from "./inngest-functions.js";

export const inngestConnect = async () => {
  return await connect({
    apps: [{ client: inngest, functions: inngestFunctions }],
    instanceId: "kb-backend",
    maxWorkerConcurrency: 20,
  });
};
