import YahooFinance from "yahoo-finance2";
import { proxiedFetch } from "../utils/proxy.js";

export const yf = new YahooFinance({
  suppressNotices: ["yahooSurvey"],
  fetch: proxiedFetch,
});
