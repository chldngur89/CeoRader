import { OpenAI } from "openai";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || "placeholder-key",
});

export type MarketEvent = {
    title: string;
    description: string;
    source: string;
};

export type ActionItem = {
    task: string;
    priority: "high" | "medium" | "low";
};

export class MarketAgentEngine {
    async runRadar(topic: string, rawData: string[]) {
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are the Radar Agent. Your job is to identify what is happening in the market for a given topic based on raw data. Summarize key events and trends."
                },
                {
                    role: "user",
                    content: `Topic: ${topic}\nData: ${rawData.join("\n")}`
                }
            ],
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0].message.content || "{}");
    }

    async runStrategy(topic: string, radarOutput: any) {
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are the Strategy Agent. Your job is to analyze why the detected market events matter for the business. Provide impact analysis and a significance score."
                },
                {
                    role: "user",
                    content: `Topic: ${topic}\nMarket Events: ${JSON.stringify(radarOutput)}`
                }
            ],
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0].message.content || "{}");
    }

    async runOpportunity(topic: string, strategyOutput: any) {
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview",
            messages: [
                {
                    role: "system",
                    content: "You are the Opportunity Agent. Based on the strategy analysis, provide 3-5 concrete action items and strategic opportunities for the CEO."
                },
                {
                    role: "user",
                    content: `Topic: ${topic}\nStrategy Analysis: ${JSON.stringify(strategyOutput)}`
                }
            ],
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0].message.content || "{}");
    }

    async fullFlow(topic: string, rawData: string[]) {
        const radar = await this.runRadar(topic, rawData);
        const strategy = await this.runStrategy(topic, radar);
        const opportunity = await this.runOpportunity(topic, strategy);

        return {
            radar,
            strategy,
            opportunity
        };
    }
}
