import { PassThrough } from "node:stream";

import type {
  AppLoadContext,
  EntryContext,
  HandleErrorFunction,
} from "react-router";
import { ServerRouter } from "react-router";
import { createReadableStreamFromReadable } from "@react-router/node";
import { isbot } from "isbot";
import type { RenderToPipeableStreamOptions } from "react-dom/server";
import { renderToPipeableStream } from "react-dom/server";
import fs from "node:fs";
import { type NullableMappedPosition, SourceMapConsumer } from "source-map";
import nodemailer from "nodemailer";
import type { SendMailOptions } from "nodemailer";

export const streamTimeout = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
  loadContext: AppLoadContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    let userAgent = request.headers.get("user-agent");

    // Ensure requests from bots and SPA Mode renders wait for all content to load before responding
    // https://react.dev/reference/react-dom/server/renderToPipeableStream#waiting-for-all-content-to-load-for-crawlers-and-static-generation
    let readyOption: keyof RenderToPipeableStreamOptions =
      (userAgent && isbot(userAgent)) || routerContext.isSpaMode
        ? "onAllReady"
        : "onShellReady";

    const { pipe, abort } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        [readyOption]() {
          shellRendered = true;
          const body = new PassThrough();
          const stream = createReadableStreamFromReadable(body);

          responseHeaders.set("Content-Type", "text/html");

          resolve(
            new Response(stream, {
              headers: responseHeaders,
              status: responseStatusCode,
            }),
          );

          pipe(body);
        },
        onShellError(error: unknown) {
          reject(error);
        },
        onError(error: unknown) {
          responseStatusCode = 500;
          // Log streaming rendering errors from inside the shell.  Don't log
          // errors encountered during initial shell rendering since they'll
          // reject and get logged in handleDocumentRequest.
          if (shellRendered) {
            console.error(error);
          }
        },
      },
    );

    // Abort the rendering stream after the `streamTimeout` so it has time to
    // flush down the rejected boundaries
    setTimeout(abort, streamTimeout + 1000);
  });
}

export const handleError: HandleErrorFunction = async (error, args) => {
  const { request, context, params } = args;
  // React Router may abort some interrupted requests, don't log those
  if (request.signal.aborted) return;

  let message = "Unknown Error.";
  const processedStack: Array<string> = [];
  const appStackLines: Array<AppStackLine> = [];

  if (error instanceof Error) {
    const lines = error.stack?.split("\n") ?? [];
    message = lines[0]; // Error message line
    const stack = lines.slice(1); // Actual stack lines

    for (const line of stack) {
      // parse the file path, line number, and column number from the line
      const match = line.match(/at .+ \((.+):(\d+):(\d+)\)/);
      if (!match) {
        processedStack.push(line);
        continue;
      }
      const [_, filePath, lineNum, colNum] = match;

      // only process our own built files, not vendor files
      if (!filePath.includes("/build/server/")) {
        processedStack.push(line);
        continue;
      }

      // get the source map contents
      const sourceMapFile = `${filePath}.map`.replace("file:", "");
      const sourceMap = fs.readFileSync(sourceMapFile).toString();

      // use the source map
      await SourceMapConsumer.with(sourceMap, null, async (consumer) => {
        // get the source code position
        const position = consumer.originalPositionFor({
          line: parseInt(lineNum),
          column: parseInt(colNum),
        });

        // if the source cannot be found, add the original line
        if (!position.source) {
          processedStack.push(line);
          return;
        }

        processedStack.push(
          `    at ${position.source}:${position.line}:${position.column}`,
        );

        const appStackLine = getAppStackLine({
          consumer,
          position,
          linesAround: 4,
        });

        if (appStackLine) {
          appStackLines.push(appStackLine);
        }
      });
    }
  }

  const payload = {
    error: {
      message,
      stack: processedStack,
    },
    request: {
      method: request.method,
      url: request.url,
    },
    params,
    context: {
      // values from context, maybe?
    },
    env: {
      // values from process.env, maybe?
    },
  };

  const snippets = [`<pre><code>${payload.error.message}</code></pre>`];
  const commentColor = "#ababab";
  for (const appStackLine of appStackLines) {
    let snippet = `<pre><code>`;
    snippet += `<span style="color: ${commentColor};">// ${appStackLine.filename}:${appStackLine.lineNumber}:${appStackLine.columnNumber}</span>\n`;
    for (const line of appStackLine.sourceCodeContext) {
      const color =
        line.lineNumber === appStackLine.lineNumber ? "red" : "black";
      const lineNumberSpan = `<span style="color: ${commentColor};">${line.lineNumber}</span>`;
      snippet += `<span style="color: ${color};">${lineNumberSpan}  ${line.code}</span>\n`;
    }
    snippet += `</pre></code>`;

    snippets.push(snippet);
  }

  snippets.push(`<pre><code>${JSON.stringify(payload, null, 2)}</code></pre>`);

  sendMail({
    from: process.env.MAILER_SEND_ERRORS_FROM,
    to: process.env.MAILER_SEND_ERRORS_TO,
    subject: "App - ERROR",
    html: snippets.join("<hr />"),
  }).catch(console.error);

  // make sure to still log the error so you can see it
  console.error(error);
};

type AppStackLine = {
  filename: string;
  lineNumber: number;
  columnNumber: number;
  sourceCodeContext: Array<{
    lineNumber: number;
    code: string;
  }>;
};

function getAppStackLine({
  consumer,
  position,
  linesAround,
}: {
  consumer: SourceMapConsumer;
  position: NullableMappedPosition;
  linesAround: number;
}) {
  if (!position.source || !position.line || !position.column) return null;

  // get the source code
  const sourceCode = consumer.sourceContentFor(position.source);
  if (!sourceCode) return null;

  // create an AppStackLine
  const appStackLine: AppStackLine = {
    filename: position.source,
    lineNumber: position.line,
    columnNumber: position.column,
    sourceCodeContext: [],
  };

  // split the source code file into an array of lines
  const lines = sourceCode.split("\n");

  // get the index of the line that showed up in the stack trace
  const targetLineIndex = position.line - 1;

  // calculate the range of lines to include
  const startLine = Math.max(0, targetLineIndex - linesAround);
  const endLine = Math.min(lines.length - 1, targetLineIndex + linesAround);

  // get the source code lines
  for (let i = startLine; i <= endLine; i++) {
    appStackLine.sourceCodeContext.push({
      lineNumber: i + 1,
      code: lines[i],
    });
  }

  return appStackLine;
}

function sendMail(options: SendMailOptions) {
  const transporter = nodemailer.createTransport({
    host: process.env.MAILER_HOST ?? "",
    port: Number(process.env.MAILER_PORT),
    secure: process.env.MAILER_SECURE === "true",
    ignoreTLS: process.env.MAILER_IGNORE_TLS === "true",
    auth: {
      user: process.env.MAILER_USER ?? "",
      pass: process.env.MAILER_PASSWORD ?? "",
    },
  });

  return transporter.sendMail(options);
}
