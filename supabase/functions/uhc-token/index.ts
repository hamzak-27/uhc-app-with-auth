const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface TokenRequest {
  client_id: string;
  client_secret: string;
  grant_type: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { client_id, client_secret, grant_type }: TokenRequest = await req.json();

    // Create form data for OAuth request
    const formData = new URLSearchParams();
    formData.append('client_id', client_id);
    formData.append('client_secret', client_secret);
    formData.append('grant_type', grant_type);

    // Make request to UHC OAuth endpoint
    const response = await fetch('https://apimarketplace.uhc.com/v1/oauthtoken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    const responseText = await response.text();
    
    if (response.ok) {
      // Try to parse as JSON
      try {
        const tokenData = JSON.parse(responseText);
        return new Response(
          JSON.stringify({
            success: true,
            data: tokenData
          }),
          {
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      } catch (parseError) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to parse response: ${responseText}`
          }),
          {
            status: 500,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }
    } else {
      return new Response(
        JSON.stringify({
          success: false,
          error: `HTTP ${response.status}: ${responseText}`
        }),
        {
          status: response.status,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: `Server error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders,
        },
      }
    );
  }
});