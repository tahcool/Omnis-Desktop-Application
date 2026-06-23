import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const url = new URL(req.url)
  const quoteId = url.searchParams.get("quote") || ""
  
  // The deep link scheme
  const deepLink = `omnis://quote/${quoteId}`;
  const fallbackUrl = `https://powerstar.co.zw`; // Or wherever the app installer is hosted

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Opening Omnis App...</title>
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          color: #1e293b;
        }
        .container {
          background: #ffffff;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          text-align: center;
          max-width: 400px;
          width: 90%;
        }
        h1 {
          font-size: 20px;
          margin-top: 0;
          color: #0f172a;
        }
        p {
          font-size: 14px;
          color: #64748b;
          line-height: 1.5;
        }
        .spinner {
          margin: 20px auto;
          width: 40px;
          height: 40px;
          border: 4px solid #e2e8f0;
          border-top-color: #2563eb;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .btn {
          display: inline-block;
          margin-top: 20px;
          padding: 10px 20px;
          background-color: #2563eb;
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          transition: background-color 0.2s;
        }
        .btn:hover {
          background-color: #1d4ed8;
        }
        #fallback {
          display: none;
        }
      </style>
    </head>
    <body>
      <div class="container" id="loading">
        <h1>Opening Omnis App...</h1>
        <div class="spinner"></div>
        <p>If prompted, please allow your browser to open the Omnis Desktop App.</p>
      </div>

      <div class="container" id="fallback">
        <h1>App Not Found</h1>
        <p>It looks like you don't have the Omnis Desktop App installed, or the browser blocked the request.</p>
        <a href="${fallbackUrl}" class="btn">Download Omnis App</a>
      </div>

      <script>
        // Attempt to launch the deep link
        window.location.href = "${deepLink}";

        // If the user is still on this page after 3 seconds, show the fallback message
        setTimeout(() => {
          document.getElementById('loading').style.display = 'none';
          document.getElementById('fallback').style.display = 'block';
        }, 3000);
      </script>
    </body>
    </html>
  `;

  return new Response(html, {
    headers: { "Content-Type": "text/html" },
  })
})
