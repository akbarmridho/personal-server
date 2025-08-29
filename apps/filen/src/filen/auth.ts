import { TOTP } from "totp-generator";
import { env } from "../utils/env.js";

export const generateTOTP = () => {
  const result = TOTP.generate(env.FILEN_2FA, {
    algorithm: "SHA-1",
    digits: 6,
  });
  return result.otp;
};
