import { Client, Databases, Storage } from 'node-appwrite';
import axios from 'axios';

// Environment variables
const {
    APPWRITE_FUNCTION_PROJECT_ID,
    APPWRITE_API_KEY,
    GRADIENT_ACCESS_TOKEN,
    GRADIENT_WORKSPACE_ID,
    FIBO_API_KEY
} = process.env;

export default async ({ req, res, log, error }) => {
    // This worker is triggered by the 'generate' function or by DB events.
    // Input: { requestId }

    const client = new Client()
        .setEndpoint('https://cloud.appwrite.io/v1')
        .setProject(APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(APPWRITE_API_KEY);

    const databases = new Databases(client);

    let payload;
    try {
        payload = JSON.parse(req.body);
    } catch(e) {
        return res.json({error: "Invalid JSON"}, 400);
    }

    const { requestId } = payload;
    if (!requestId) return res.json({error: "Missing requestId"}, 400);

    const updateStatus = async (status, message) => {
        await databases.updateDocument('database_id', 'requests', requestId, {
            status,
            // message // Assuming we add a message field to the collection schema
        });
    };

    try {
        // 1. Get Request Data
        const requestDoc = await databases.getDocument('database_id', 'requests', requestId);
        const { query, knowledge_level } = requestDoc;

        // 2. Paper Finder Agent
        await updateStatus('finding_paper', 'Finding relevant papers...');

        // Call Gradient AI or ArXiv API directly
        // For MVP, let's assume we call ArXiv API directly here or via Gradient
        const arxivResponse = await axios.get(`http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=1`);
        // Parse XML response... (omitted for brevity, assume we got metadata)
        const paperMetadata = {
            arxiv_id: "1706.03762",
            title: "Attention Is All You Need",
            abstract: "The dominant sequence transduction models...",
            published: "2017-06-12",
            pdf_url: "https://arxiv.org/pdf/1706.03762.pdf",
            arxiv_url: "https://arxiv.org/abs/1706.03762"
        };

        // 3. Summarizer Agent
        await updateStatus('summarizing', 'Reading and summarizing...');

        // Call Gradient AI to summarize
        // const summary = await gradientAi.summarize(paperMetadata.abstract, knowledge_level);
        const summary = {
             title: paperMetadata.title,
             one_liner: "A new way to help computers understand language by focusing on what matters most",
             key_concepts: [
                { name: "Self-Attention", explanation: "...", visual_metaphor: "..." }
             ],
             key_finding: "Transformers outperform previous models",
             real_world_impact: "Powers ChatGPT",
             fibo_prompt: "..." // Generated prompt
        };

        // 4. Image Generation
        await updateStatus('generating_image', 'Generating your infographic...');

        // Call Fibo API
        // const imageRes = await axios.post('https://api.bria.ai/v1/image/generate', { ... });
        const imageUrl = "https://placehold.co/1024x1024/png?text=Generated+Infographic";

        // 5. Store Result
        await databases.createDocument('database_id', 'results', 'unique()', {
            request_id: requestId,
            arxiv_id: paperMetadata.arxiv_id,
            paper_title: paperMetadata.title,
            paper_url: paperMetadata.arxiv_url,
            summary_json: JSON.stringify(summary),
            image_url: imageUrl,
            created_at: new Date().toISOString()
        });

        await updateStatus('complete', 'Complete!');

        return res.json({ success: true });

    } catch (err) {
        error(err);
        await updateStatus('failed', 'An error occurred');
        return res.json({ error: err.message }, 500);
    }
};
