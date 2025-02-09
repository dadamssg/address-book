import {
  Form,
  isRouteErrorResponse,
  Outlet,
  redirect,
  Scripts,
  ScrollRestoration,
} from "react-router";
import type { Route } from "./+types/root";
import { createEmptyContact } from "./data";
import ApiObjectFormatter from "./dev/ApiObjectFormatter.js?raw";
import SimpleObjectFormatter from "./dev/SimpleObjectFormatter.js?raw";
import QueryFormatter from "./dev/QueryObjectFormatter.js?raw";

import appStylesHref from "./app.css?url";
import { useEffect } from "react";
import { logSwitch } from "~/service/log-switch.server";

export async function loader() {
  return {
    logSwitch,
    sseLogging: process.env.NODE_ENV === "development",
    customObjectFormatters:
      process.env.NODE_ENV === "development"
        ? [ApiObjectFormatter, QueryFormatter, SimpleObjectFormatter]
        : [],
  };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  if (formData.get("intent") === "toggle-log-switch") {
    logSwitch.source = logSwitch.source === "api" ? "db" : "api";
    return null;
  }
  const contact = await createEmptyContact();

  return redirect(`/contacts/${contact.id}/edit`);
}

export default function App({ loaderData }: Route.ComponentProps) {
  const { sseLogging, customObjectFormatters, logSwitch } = loaderData;

  useEffect(() => {
    // only establish a connection if sseLogging is turned on
    if (!sseLogging) return;
    const source = new EventSource("/logs");
    const handler = (e: MessageEvent) => {
      try {
        // attempt to parse the incoming message as json
        console.log(JSON.parse(e.data));
      } catch (err) {
        // otherwise log it as is
        console.log(e.data);
      }
    };
    let eventName = "log"; // <- must match the event name we use in the backend
    source.addEventListener(eventName, handler);
    return () => {
      source.removeEventListener(eventName, handler);
      source.close();
    };
  }, [sseLogging]);

  return (
    <>
      {customObjectFormatters.length > 0 ? (
        <script
          dangerouslySetInnerHTML={{
            __html: customObjectFormatters.join("\n"),
          }}
        />
      ) : null}
      <Form method="post">
        <button
          style={{
            position: "fixed",
            bottom: "1rem",
            right: "1rem",
            textTransform: "uppercase",
          }}
          name="intent"
          value="toggle-log-switch"
        >
          {logSwitch.source}
        </button>
      </Form>
      <Outlet />
    </>
  );
}

// The Layout component is a special export for the root route.
// It acts as your document's "app shell" for all route components, HydrateFallback, and ErrorBoundary
// For more information, see https://reactrouter.com/explanation/special-files#layout-export
export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href={appStylesHref} />
      </head>
      <body style={{ position: "relative" }}>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// The top most error boundary for the app, rendered when your app throws an error
// For more information, see https://reactrouter.com/start/framework/route-module#errorboundary
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (import.meta.env.DEV && error && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main id="error-page">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre>
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

export function HydrateFallback() {
  return (
    <div id="loading-splash">
      <div id="loading-splash-spinner" />
      <p>Loading, please wait...</p>
    </div>
  );
}
