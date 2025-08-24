import { TOTP } from "totp-generator";
import { env } from "../utils/env.js";

export const generateTOTP = () => {
  const result = TOTP.generate(env.FILEN_2FA);
  return result.otp;
};
