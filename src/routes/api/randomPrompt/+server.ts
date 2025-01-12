import { obtainRandomPrompt } from "$lib/algo/prompts";

export const GET = async () => {
    const prompt = await obtainRandomPrompt();
    return new Response(JSON.stringify({ prompt }));
}