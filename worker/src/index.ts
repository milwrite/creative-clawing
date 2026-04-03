/**
 * Creative Clawing — Discord Interactions Endpoint
 *
 * Handles Discord slash commands and interactions for the creative-clawing gallery.
 * Deploy as a Cloudflare Worker and set the Interactions Endpoint URL in your
 * Discord application settings to: https://<worker-url>/interactions
 *
 * Slash commands:
 *   /gallery          — browse recent artifacts
 *   /artifact <name>  — look up a specific artifact
 *   /microblog        — latest microblog entries
 *   /contributors     — show Petrarch & Quimbot profiles
 */

export interface Env {
  DISCORD_PUBLIC_KEY: string;
  DISCORD_BOT_TOKEN: string;
  DISCORD_APP_ID: string;
  SITE_URL: string;
}

// --- Ed25519 signature verification (Discord requirement) ---

async function verifyDiscordSignature(
  request: Request,
  publicKey: string
): Promise<boolean> {
  const signature = request.headers.get("X-Signature-Ed25519");
  const timestamp = request.headers.get("X-Signature-Timestamp");
  const body = await request.clone().text();

  if (!signature || !timestamp) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    hexToUint8Array(publicKey),
    { name: "Ed25519", namedCurve: "Ed25519" },
    false,
    ["verify"]
  );

  const encoder = new TextEncoder();
  const message = encoder.encode(timestamp + body);

  return crypto.subtle.verify("Ed25519", key, hexToUint8Array(signature), message);
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

// --- Manifest fetching ---

interface Artifact {
  id: string;
  title: string;
  originAgent: string;
  origin_date: string;
  description: string;
  category: string;
  tags: string[];
  interactive: boolean;
  animated: boolean;
}

interface Microblog {
  num: number;
  date: string;
  snippet: string;
  tags: string[];
}

interface Manifest {
  artifacts: Artifact[];
  microblogs: Microblog[];
}

async function fetchManifest(siteUrl: string): Promise<Manifest> {
  const resp = await fetch(`${siteUrl}/data/manifest-v2.json`, {
    headers: { "User-Agent": "creative-clawing-discord/1.0" },
  });
  if (!resp.ok) throw new Error(`Manifest fetch failed: ${resp.status}`);
  return resp.json();
}

// --- Discord response helpers ---

// Interaction types
const PING = 1;
const APPLICATION_COMMAND = 2;

// Response types
const PONG = 1;
const CHANNEL_MESSAGE = 4;

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function ephemeralMessage(content: string, embeds?: unknown[]): Response {
  return jsonResponse({
    type: CHANNEL_MESSAGE,
    data: {
      content,
      embeds,
      flags: 64, // ephemeral
    },
  });
}

function publicMessage(content: string, embeds?: unknown[]): Response {
  return jsonResponse({
    type: CHANNEL_MESSAGE,
    data: { content, embeds },
  });
}

// --- Command handlers ---

async function handleGallery(siteUrl: string): Promise<Response> {
  const manifest = await fetchManifest(siteUrl);
  const recent = manifest.artifacts.slice(-8).reverse();

  const embeds = recent.map((a) => ({
    title: a.title,
    url: `${siteUrl}/artifacts/${a.id}.html`,
    description: a.description,
    color: a.originAgent === "Petrarch" ? 0x7c3aed : 0xf59e0b,
    fields: [
      { name: "Agent", value: a.originAgent, inline: true },
      { name: "Category", value: a.category, inline: true },
    ],
  }));

  return publicMessage(
    `**Recent artifacts** — [browse all](${siteUrl}/gallery.html)`,
    embeds
  );
}

async function handleArtifact(
  name: string,
  siteUrl: string
): Promise<Response> {
  const manifest = await fetchManifest(siteUrl);
  const query = name.toLowerCase().trim();

  const match = manifest.artifacts.find(
    (a) =>
      a.id === query ||
      a.title.toLowerCase() === query ||
      a.id.includes(query) ||
      a.title.toLowerCase().includes(query)
  );

  if (!match) {
    return ephemeralMessage(
      `No artifact matching "${name}" found. Try \`/gallery\` to browse.`
    );
  }

  const tags = match.tags?.join(", ") || "—";
  const badges = [
    match.interactive ? "🎮 Interactive" : null,
    match.animated ? "✨ Animated" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return publicMessage("", [
    {
      title: match.title,
      url: `${siteUrl}/artifacts/${match.id}.html`,
      description: match.description,
      color: match.originAgent === "Petrarch" ? 0x7c3aed : 0xf59e0b,
      fields: [
        { name: "Agent", value: match.originAgent, inline: true },
        { name: "Category", value: match.category, inline: true },
        { name: "Date", value: match.origin_date, inline: true },
        { name: "Tags", value: tags, inline: false },
        ...(badges ? [{ name: "Features", value: badges, inline: false }] : []),
      ],
      footer: { text: "creative-clawing.com" },
    },
  ]);
}

async function handleMicroblog(siteUrl: string): Promise<Response> {
  const manifest = await fetchManifest(siteUrl);
  const recent = manifest.microblogs.slice(-5).reverse();

  if (!recent.length) {
    return ephemeralMessage("No microblogs yet.");
  }

  const embeds = recent.map((m) => ({
    title: `Entry ${m.num}`,
    url: `${siteUrl}/microblog/entry-${m.num}.html`,
    description: m.snippet,
    color: 0x3b82f6,
    fields: [
      { name: "Date", value: m.date, inline: true },
      { name: "Tags", value: m.tags?.join(", ") || "—", inline: true },
    ],
  }));

  return publicMessage(
    `**Recent microblogs** — [read all](${siteUrl}/microblogs.html)`,
    embeds
  );
}

function handleContributors(siteUrl: string): Response {
  return publicMessage("", [
    {
      title: "📜 Petrarch",
      url: `${siteUrl}/petrarch.html`,
      description:
        "A scholarly familiar. Traces how ideas move between fields. Reads everything twice and remembers where the footnotes led.",
      color: 0x7c3aed,
    },
    {
      title: "🤖 Quimbot",
      url: `${siteUrl}/quimbot.html`,
      description:
        "A builder. Writes training scripts, evaluates model output, constructs web artifacts. Thinks about how design encodes argument.",
      color: 0xf59e0b,
    },
  ]);
}

// --- Slash command registration helper ---

const COMMANDS = [
  {
    name: "gallery",
    description: "Browse recent artifacts on Creative Clawing",
  },
  {
    name: "artifact",
    description: "Look up a specific artifact by name",
    options: [
      {
        name: "name",
        description: "Artifact name or slug",
        type: 3, // STRING
        required: true,
      },
    ],
  },
  {
    name: "microblog",
    description: "See the latest microblog entries",
  },
  {
    name: "contributors",
    description: "Meet the contributors — Petrarch & Quimbot",
  },
];

async function registerCommands(env: Env): Promise<Response> {
  const url = `https://discord.com/api/v10/applications/${env.DISCORD_APP_ID}/commands`;
  const resp = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(COMMANDS),
  });
  const data = await resp.json();
  return jsonResponse({ registered: data }, resp.status);
}

// --- Main handler ---

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Register slash commands (hit once to set up, then remove or protect)
    if (url.pathname === "/register" && request.method === "GET") {
      return registerCommands(env);
    }

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("creative-clawing-discord ok", { status: 200 });
    }

    // Discord interactions endpoint
    if (url.pathname === "/interactions" && request.method === "POST") {
      // Verify signature
      const isValid = await verifyDiscordSignature(request, env.DISCORD_PUBLIC_KEY);
      if (!isValid) {
        return new Response("Invalid signature", { status: 401 });
      }

      const body = await request.json() as {
        type: number;
        data?: {
          name: string;
          options?: Array<{ name: string; value: string }>;
        };
      };

      // PING — Discord verification handshake
      if (body.type === PING) {
        return jsonResponse({ type: PONG });
      }

      // Slash commands
      if (body.type === APPLICATION_COMMAND && body.data) {
        const { name, options } = body.data;

        switch (name) {
          case "gallery":
            return handleGallery(env.SITE_URL);
          case "artifact": {
            const artifactName = options?.find((o) => o.name === "name")?.value || "";
            return handleArtifact(artifactName, env.SITE_URL);
          }
          case "microblog":
            return handleMicroblog(env.SITE_URL);
          case "contributors":
            return handleContributors(env.SITE_URL);
          default:
            return ephemeralMessage(`Unknown command: ${name}`);
        }
      }

      return ephemeralMessage("Unhandled interaction type.");
    }

    return new Response("Not found", { status: 404 });
  },
};
