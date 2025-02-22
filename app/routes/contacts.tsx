import React, { useEffect, useState } from "react";
import { Form, useSubmit } from "react-router";
import type { Route } from "./+types/contacts";
import { getContacts } from "../data";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get("q");
  const contacts = await getContacts(q);
  console.log("getContacts", { q });
  return { contacts, q };
}

export async function clientLoader({
  request,
  serverLoader,
}: Route.ClientLoaderArgs) {
  console.log("clientLoader");
  await requestNotCancelled(request, 400);
  return await serverLoader();
}

function requestNotCancelled(request: Request, ms: number) {
  const { signal } = request;
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason);
      return;
    }

    const timeoutId = setTimeout(resolve, ms);

    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timeoutId);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

export default function Contacts({ loaderData }: Route.ComponentProps) {
  const submit = useSubmit();
  return (
    <div>
      <Form
        onChange={(event) => {
          submit(event.currentTarget);
        }}
      >
        <input name="q" />
      </Form>
      <pre>
        <code>{JSON.stringify(loaderData, null, 2)}</code>
      </pre>
    </div>
  );
}

function useDebounce(value: string | undefined, delay: number) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

function ContactsTable({ data }: { data: any }) {
  return (
    <pre>
      <code>{JSON.stringify(data, null, 2)}</code>
    </pre>
  );
}
