import { buildApp } from "./app";

type LambdaEvent = {
  rawPath: string;
  requestContext?: {
    http?: {
      method?: string;
    };
  };
  queryStringParameters?: Record<string, string> | null;
  headers?: Record<string, string>;
  body?: string | null;
};

export async function handler(event: LambdaEvent) {
  const app = buildApp();

  const method = event.requestContext?.http?.method ?? "GET";
  const query = event.queryStringParameters
    ? new URLSearchParams(Object.entries(event.queryStringParameters)).toString()
    : "";
  const url = query ? `${event.rawPath}?${query}` : event.rawPath;

  const response = await app.inject({
    method: method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "OPTIONS" | "HEAD",
    url,
    payload: event.body ?? undefined,
    headers: event.headers,
  });

  return {
    statusCode: response.statusCode,
    headers: { "content-type": "application/json" },
    body: response.body,
  };
}
