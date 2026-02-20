import axios from "axios";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { fetch as nativeFetch } from "node-fetch-native";
import { createFetch } from "node-fetch-native/proxy";
import { env } from "../infrastructure/env.js";

export const stockProxyAgent = env.STOCK_HTTP_PROXY_URL
  ? new HttpProxyAgent(env.STOCK_HTTP_PROXY_URL)
  : null;

export const stockProxyAgentHttps = env.STOCK_HTTP_PROXY_URL
  ? new HttpsProxyAgent(env.STOCK_HTTP_PROXY_URL)
  : null;

export const proxiedFetch = env.STOCK_HTTP_PROXY_URL
  ? createFetch({
      url: env.STOCK_HTTP_PROXY_URL,
    })
  : nativeFetch;

export const generalProxiedAxios = stockProxyAgent
  ? axios.create({
      httpAgent: stockProxyAgent,
      httpsAgent: stockProxyAgentHttps,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    })
  : axios.create({
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      },
    });
