import { Telegraf } from "telegraf";
import { env } from "./env.js";

export const telegraf: Telegraf = new Telegraf(env.TELEGRAM_KEY);
