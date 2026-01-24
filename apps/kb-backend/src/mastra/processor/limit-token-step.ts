import {
  type ProcessInputStepArgs,
  type Processor,
  TokenLimiter,
} from "@mastra/core/processors";

export class LimitTokenStep implements Processor {
  id = "limit-token-step";

  private tokenLimiter: TokenLimiter;

  // half of GPT 5.2 context window limit
  constructor(tokenLimit: number = 200_000) {
    this.tokenLimiter = new TokenLimiter({
      limit: tokenLimit,
      strategy: "truncate",
      countMode: "cumulative",
    });
  }

  processInputStep(args: ProcessInputStepArgs<unknown>) {
    return this.tokenLimiter.processInput(args);
  }
}
