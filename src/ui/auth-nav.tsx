import { authClient } from "../lib/auth-client";

export default function AuthNav() {
  const { data } = authClient.useSession();

  return (
    <a
      href={data?.user ? "/account" : "/login"}
      className="type-body-md text-content-secondary hover:text-content-primary focus-visible:outline-content-primary shrink-0 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-4"
    >
      {data?.user ? "Account" : "Sign in"}
    </a>
  );
}
