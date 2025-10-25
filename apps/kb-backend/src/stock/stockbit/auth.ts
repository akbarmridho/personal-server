import axios, { AxiosError } from "axios";
import { KV } from "../../db/kv.js";
import type { JsonObject } from "../../db/types.js";

export interface AuthData {
  refreshToken: string;
  refreshExpiredAt: string;
  accessToken: string;
  accessExpiredAt: string;
}

export interface BaseStockbitResponse<T> {
  message: string;
  data: T;
}

const key = "stockbit.auth";

export class StockbitAuthError extends Error {}

export class StockbitAuth {
  private authData: AuthData | null = null;

  private async ensureFetched() {
    if (this.authData !== null) {
      return;
    }

    const data = await KV.get(key);

    if (data === null) {
      return;
    }

    this.authData = data as unknown as AuthData;
  }

  async get(): Promise<AuthData | null> {
    await this.ensureFetched();

    return this.authData;
  }

  async set(data: AuthData) {
    await KV.set(key, data as any as JsonObject);
    this.authData = data;

    await this.test();
  }

  async test() {
    await this.ensureFetched();
    if (this.authData === null) {
      throw new StockbitAuthError("Auth data is not set");
    }

    try {
      await axios.get("https://exodus.stockbit.com/emitten/IHSG/info", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authData.accessToken}`,
        },
      });
    } catch (e) {
      if (e instanceof AxiosError) {
        if (e.response && e.response.status >= 400 && e.response.status < 500) {
          throw new StockbitAuthError("Invalid token");
        }
      }

      throw e;
    }
  }

  async refresh() {
    await this.ensureFetched();
    if (this.authData === null) {
      throw new StockbitAuthError("Auth data is not set");
    }

    try {
      const response = await axios.post(
        "https://exodus.stockbit.com/login/refresh",
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.authData.refreshToken}`,
          },
        },
      );

      const data = response.data as {
        message: string;
        data: {
          access: { token: string; expired_at: string };
          refresh: { token: string; expired_at: string };
        };
      };

      await this.set({
        accessToken: data.data.access.token,
        accessExpiredAt: data.data.access.expired_at,
        refreshToken: data.data.refresh.token,
        refreshExpiredAt: data.data.refresh.expired_at,
      });

      await this.test();
    } catch (e) {
      if (e instanceof AxiosError) {
        if (e.response && e.response.status >= 400 && e.response.status < 500) {
          throw new StockbitAuthError("Invalid token");
        }
      }

      throw e;
    }
  }
}

export const stockbitAuth = new StockbitAuth();
