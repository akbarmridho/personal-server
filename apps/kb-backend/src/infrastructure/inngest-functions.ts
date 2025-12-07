import type { InngestFunction } from "inngest";
import { updateCompanies } from "../data-modules/profiles/companies.js";

export const inngestFunctions: InngestFunction.Like[] = [updateCompanies];
