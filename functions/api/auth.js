export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code) {
    const githubAuthUrl = new URL('https://github.com/login/oauth/authorize');
    githubAuthUrl.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    githubAuthUrl.searchParams.set('redirect_uri', `${url.origin}/api/auth`);
    githubAuthUrl.searchParams.set('scope', 'repo');
    if (state) githubAuthUrl.searchParams.set('state', state);
    return Response.redirect(githubAuthUrl.toString(), 302);
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  const tokenData = await tokenResponse.json();
  const token = tokenData.access_token;

  const script = `
    (function() {
      function receiveMessage(e) {
        window.opener.postMessage(
          'authorization:github:success:' + JSON.stringify({token: '${token}', provider: 'github'}),
          e.origin
        );
      }
      window.addEventListener("message", receiveMessage, false);
      window.opener.postMessage("authorizing:github", "*");
    })();
  `;

  return new Response(`<!DOCTYPE html><html><body><script>${script}</script></body></html>`, {
    headers: { 'Content-Type': 'text/html' }
  });
}
