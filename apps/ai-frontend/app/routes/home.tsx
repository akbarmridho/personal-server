import { redirect } from "react-router";
import type { Route } from "./+types/home";

export function clientLoader({}: Route.ClientLoaderArgs) {
  return redirect("/timeline/general");
}

export default function Home() {
  return null;
}
