import axios from "axios";
import { HttpProxyAgent } from "http-proxy-agent";
import { fetch as nativeFetch } from "node-fetch-native";
import { createFetch } from "node-fetch-native/proxy";
import { env } from "../env.js";

export const stockProxyAgent = env.STOCK_HTTP_PROXY_URL
  ? new HttpProxyAgent(env.STOCK_HTTP_PROXY_URL)
  : null;

export const proxiedFetch = env.STOCK_HTTP_PROXY_URL
  ? createFetch({
      url: env.STOCK_HTTP_PROXY_URL,
    })
  : nativeFetch;

export const proxiedAxios = stockProxyAgent
  ? axios.create({
      httpAgent: stockProxyAgent,
      httpsAgent: stockProxyAgent,
    })
  : axios.create({});
