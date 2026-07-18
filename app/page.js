import { headers } from "next/headers";
import LandingClient from "./LandingClient";

export default async function Page() {
  const headersList = await headers();
  const country = headersList.get("x-vercel-ip-country") ?? "OTHERS";
  
  return <LandingClient country={country} />;
}
