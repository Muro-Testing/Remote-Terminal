import { Router } from "express";
import { z } from "zod";

const relaySchema = z.object({
  callbackUrl: z.string().min(1)
});

export const oauthRelayRoutes = Router();

oauthRelayRoutes.post("/oauth/relay-callback", async (req, res) => {
  const parsed = relaySchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "invalid_request",
      details: parsed.error.flatten()
    });
  }

  let callback: URL;
  try {
    callback = new URL(parsed.data.callbackUrl);
  } catch {
    return res.status(400).json({
      error: "invalid_callback_url",
      message: "Callback URL is not valid."
    });
  }

  const isAllowedHost = callback.hostname === "localhost" || callback.hostname === "127.0.0.1";
  const portNumber = Number(callback.port || 80);
  const isAllowedPort = Number.isInteger(portNumber) && portNumber >= 1 && portNumber <= 65535;
  const isAllowedProtocol = callback.protocol === "http:";
  const hasPath = callback.pathname.length > 0 && callback.pathname.length <= 200;
  const hasReasonableQuery = callback.search.length <= 5000;
  if (!isAllowedHost || !isAllowedPort || !isAllowedProtocol || !hasPath || !hasReasonableQuery) {
    return res.status(400).json({
      error: "invalid_callback_url",
      message: "Only localhost/127.0.0.1 HTTP callback URLs with valid port/path are allowed."
    });
  }

  const relayTarget = `http://127.0.0.1:${portNumber}${callback.pathname}${callback.search}`;
  try {
    const relayResponse = await fetch(relayTarget, {
      method: "GET",
      redirect: "manual"
    });

    const text = await relayResponse.text();
    return res.json({
      ok: relayResponse.status >= 200 && relayResponse.status < 400,
      status: relayResponse.status,
      location: relayResponse.headers.get("location"),
      bodySnippet: text.slice(0, 500)
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Relay request failed.";
    return res.status(502).json({
      error: "relay_failed",
      message
    });
  }
});
