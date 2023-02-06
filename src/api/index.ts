/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `wrangler dev src/index.ts` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `wrangler publish src/index.ts --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
  // Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
  // MY_KV_NAMESPACE: KVNamespace;
  //
  // Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
  // MY_DURABLE_OBJECT: DurableObjectNamespace;
  //
  // Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
  // MY_BUCKET: R2Bucket;

  COHERE_API_KEY: string;
}

// curl --location --request POST 'https://api.cohere.ai/generate' \
//   --header 'Authorization: BEARER hgxvkhaqsJOMH2K26nnOZHtDlbmukpwNAC2OjaRJ' \
//   --header 'Content-Type: application/json' \
//   --header 'Cohere-Version: 2022-12-06' \
//   --data-raw '{
//       "model": "command-xlarge-20221108",
//       "prompt": "Write a 5 out of 5 stars review comment for a laptop named \"macbook air\" highlighting \"battery\" and \"price\".",
// "max_tokens": 100,
// "temperature": 1.2,
// "k": 0,
// "p": 0.75,
// "frequency_penalty": 0,
// "presence_penalty": 0,
// "stop_sequences": [],
// "return_likelihoods": "NONE"
//     }'

function getOptions({ COHERE_API_KEY }) {
  return {
    method: "POST",
    url: "https://api.cohere.ai/generate",
    headers: {
      accept: "application/json",
      "Cohere-Version": "2022-12-06",
      "content-type": "application/json",
      authorization: `Bearer ${COHERE_API_KEY}`,
    },
    data: {
      model: "command-xlarge-20221108",
      prompt:
        'Write a 5 out of 5 stars review comment for a laptop named "macbook air" highlighting "battery" and "price".',
      max_tokens: 110,
      temperature: 1.2,
      k: 0,
      p: 0.75,
      frequency_penalty: 0,
      presence_penalty: 0,
      stop_sequences: [],
      return_likelihoods: "NONE",
    },
  };
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const canDoRequest =
      corsHeaders["Access-Control-Allow-Methods"].includes(request.method) &&
      (corsHeaders["Access-Control-Allow-Origin"].includes(
        request.headers.get("Origin")
      ) ||
        corsHeaders["Access-Control-Allow-Origin"] === "*");
    if (!canDoRequest) {
      return new Response(JSON.stringify({ error: "not allowed" }), {
        status: 403,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        },
      });
    }
    const params = await request.json<{
      product?: string;
      productName?: string;
      stars?: number;
      totalStars?: number;
      highlights?: string;
    }>();
    const { product, productName, stars, totalStars, highlights } = params;
    if (!product || !productName || !stars)
      return new Response(JSON.stringify({ error: "missing params" }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET,HEAD,POST,OPTIONS",
        },
      });

    const prompt = `Write a ${stars} out of ${totalStars} stars review comment for a ${product} named "${productName}" ${
      highlights ? `highlighting "${highlights}"` : ""
    }.`;
    const options = getOptions({ COHERE_API_KEY: env.COHERE_API_KEY });
    const response = await fetch(options.url, {
      method: options.method,
      headers: options.headers,
      body: JSON.stringify({ ...options.data, prompt }),
    });
    const data = await response.json();
    return new Response(JSON.stringify(data, null, 2), {
      headers: corsHeaders,
    });
  },
};
