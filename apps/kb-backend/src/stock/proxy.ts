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

export const proxiedAxios =
  // stockProxyAgent
  // ? axios.create({
  //     httpAgent: stockProxyAgent,
  //     httpsAgent: stockProxyAgent,
  //     headers: {
  //       Origin: "https://stockbit.com",
  //       referer: "https://stockbit.com",
  //       "User-Agent":
  //         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
  //     },
  //   })
  // :
  axios.create({
    headers: {
      Origin: "https://stockbit.com",
      referer: "https://stockbit.com",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
    },
  });
