import { redirect } from "react-router";
import type { Route } from "./+types/home";

export function clientLoader({}: Route.ClientLoaderArgs) {
  return redirect("/timeline/all");
}

export default function Home() {
  return null;
}
