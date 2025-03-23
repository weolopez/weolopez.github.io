export async function generateResponse(prompt: string, image?: string): Promise<string> {
    const BEARER_TOKEN = Deno.env.get("BEARER_TOKEN");

    if (!BEARER_TOKEN) {
        throw new Error("BEARER_TOKEN environment variable not set.");
    }

    const url = "https://litellm.weolopez.com/chat/completions";

    // Build messages array based on input parameters
    const messages: Array<{ role: string; content: string }> = [
        {
            role: "user",
            content: prompt,
        },
    ];

    if (image) {
        messages.push({
            role: "user",
            content: `Image: ${image}`,
        });
    }

    const payload = {
        model: "gpt-4o-mini",
        stream: false,
        messages,
    };

    const headers = new Headers({
        "authorization": `Bearer ${BEARER_TOKEN}`,
        "content-type": "application/json"
    });

    const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Request failed with status: ${response.status}: ${errorText}`);
    }

    // Parse the response as JSON
    const jsonResponse = await response.json();
    const result = jsonResponse.choices?.[0]?.message?.content || "";
    return result;
}