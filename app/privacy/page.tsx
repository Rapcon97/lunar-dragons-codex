export default function PrivacyPage() {
  return (
    <main
      style={{
        maxWidth: "760px",
        margin: "0 auto",
        padding: "64px 24px",
        fontFamily: "system-ui, sans-serif",
        lineHeight: 1.6,
      }}
    >
      <h1>Lunar Dragons Codex — Privacy Policy</h1>

      <p>
        The Lunar Dragons Codex is a private Warhammer 40,000 homebrew lore
        project. Its GPT integration communicates with the Lunar Dragons Codex
        API to retrieve and maintain project lore.
      </p>

      <h2>Data processed</h2>

      <p>
        Requests made through the Lunar Dragons GPT may send search terms,
        lore text, record identifiers, and other information required to
        perform the requested Codex operation.
      </p>

      <h2>Purpose</h2>

      <p>
        Data sent to the Codex API is used only to retrieve, search, create,
        or update Lunar Dragons lore and related project information.
      </p>

      <h2>Authentication</h2>

      <p>
        Access to protected Codex API operations requires a private API key.
        The API key is not stored in the public OpenAPI specification.
      </p>

      <h2>Storage</h2>

      <p>
        Approved lore and project information may be stored in the Lunar
        Dragons Codex database. The API does not expose a public delete
        operation.
      </p>

      <h2>Third parties</h2>

      <p>
        The service is hosted using Cloudflare infrastructure and may be
        accessed through ChatGPT when the configured Lunar Dragons GPT Action
        is used.
      </p>

      <h2>Contact</h2>

      <p>
        Questions regarding this privacy policy should be directed to the
        administrator of the Lunar Dragons Codex.
      </p>
    </main>
  );
}