import { Popover } from "@base-ui/react/popover";
import {
  ArrowRightStartOnRectangleIcon,
  FolderIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";

const itemClass =
  "type-body-md text-content-primary hover:bg-fill-strong mx-1 flex h-9 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-left outline-none";

type AccountUser = {
  email: string;
  image: string;
};

export function AccountMenu() {
  const [user, setUser] = useState<AccountUser | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    authClient.getSession().then(({ data }) => {
      if (!active) return;
      const sessionUser = data?.user;
      if (!sessionUser?.image) return;
      setUser({
        email: sessionUser.email,
        image: sessionUser.image,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const signOut = () => {
    setPending(true);
    setError(null);
    authClient
      .signOut()
      .then((result) => {
        if (result.error) throw new Error("Sign-out failed");
        window.location.assign("/");
      })
      .catch(() => {
        setPending(false);
        setError("Sign-out failed. Please try again.");
      });
  };

  if (!user) return null;

  return (
    <Popover.Root>
      <Popover.Trigger
        className="focus-visible:outline-content-primary inline-flex size-8 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:outline-1 focus-visible:outline-offset-2"
        aria-label="Account"
      >
        <img
          src={user.image}
          alt=""
          width="32"
          height="32"
          className="border-line-default size-8 rounded-full border object-cover"
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner
          className="z-50"
          side="bottom"
          align="end"
          sideOffset={8}
        >
          <Popover.Popup className="border-line-default bg-surface-default w-64 rounded-xl border py-1 shadow-sm outline-none">
            <div className="flex min-w-0 items-center gap-2 px-3 pt-1.5 pb-1">
              <img
                src={user.image}
                alt=""
                width="20"
                height="20"
                className="border-line-default size-5 shrink-0 rounded-full border object-cover"
              />
              <p className="type-body-sm text-content-secondary min-w-0 truncate">
                {user.email}
              </p>
            </div>
            <a href="/library" className={itemClass}>
              <FolderIcon className="size-4 shrink-0" aria-hidden="true" />
              Library
            </a>
            <div className="border-line-default mx-3 my-1 border-t" />
            <button
              type="button"
              className="type-body-md text-content-primary hover:bg-fill-strong flex h-9 w-full cursor-pointer items-center gap-2.5 px-3 text-left outline-none disabled:opacity-60"
              disabled={pending}
              onClick={signOut}
            >
              <ArrowRightStartOnRectangleIcon
                className="size-4 shrink-0"
                aria-hidden="true"
              />
              Sign out
            </button>
            {error ? (
              <p
                role="alert"
                className="type-body-sm text-content-secondary px-3 py-1 text-pretty"
              >
                {error}
              </p>
            ) : null}
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
