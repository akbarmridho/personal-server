import axios from "axios";
import { fetch as nativeFetch } from "node-fetch-native";
import { createProxy } from "node-fetch-native/proxy";
import { SocksProxyAgent } from "socks-proxy-agent";
import { env } from "../env.js";

export const stockProxyAgent = env.STOCK_SOCKS_PROXY_URL
  ? new SocksProxyAgent(env.STOCK_SOCKS_PROXY_URL)
  : null;

export const proxiedFetch = (
  input: string | URL | globalThis.Request,
  init?: RequestInit,
): Promise<Response> => {
  let opts = {
    ...init,
  };

  if (env.STOCK_SOCKS_PROXY_URL) {
    const nativeFetchProxy = createProxy({ url: env.STOCK_SOCKS_PROXY_URL });
    opts = {
      ...opts,
      ...nativeFetchProxy,
    };
  }

  return nativeFetch(input, opts);
};

export const proxiedAxios = stockProxyAgent
  ? axios.create({
      httpAgent: stockProxyAgent,
      httpsAgent: stockProxyAgent,
    })
  : axios.create({});
