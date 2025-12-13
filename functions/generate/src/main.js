import { Client, Databases, Storage } from 'node-appwrite';

// Environment variables (provided by Appwrite Function)
const {
    APPWRITE_FUNCTION_PROJECT_ID,
    APPWRITE_API_KEY,
    GRADIENT_ACCESS_TOKEN,
    GRADIENT_WORKSPACE_ID,
    FIBO_API_KEY
} = process.env;

export default async ({ req, res, log, error }) => {
    const client = new Client()
        .setEndpoint('https://cloud.appwrite.io/v1')
        .setProject(APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(APPWRITE_API_KEY);

    const databases = new Databases(client);

    if (req.method === 'POST' && req.path === '/') {
        try {
            const { query, knowledge_level } = JSON.parse(req.body);

            // 1. Create a request record in Database
            const requestDoc = await databases.createDocument(
                'database_id', // DB ID
                'requests',    // Collection ID
                'unique()',
                {
                    query,
                    knowledge_level,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }
            );

            // 2. Trigger async processing (could be a separate function execution or just a promise that we don't await if using long-running execution)
            // For Appwrite Functions, usually we return immediately and let the process run if async is supported,
            // OR we rely on queues.
            // Here, we'll return the request ID and assume another process or a scheduled function picks it up,
            // OR if this function has a long timeout, we process it here.
            // Given the spec says "Response (async - returns immediately)", we should ideally spawn a background worker.
            // But Appwrite Functions are event-driven.

            // To simulate async work in this pattern without a queue system:
            // One way is to invoke another function asynchronously.
            // Or if we just want to start the process:

            // TRIGGER WORKER FUNCTION (Async)
            // await functions.createExecution('worker_function_id', JSON.stringify({ requestId: requestDoc.$id }), true);

            // For now, let's assume this function handles the initial creation and returns.
            // The actual processing would happen in a triggered function (e.g. triggered by document creation)
            // or we invoke a worker here.

            return res.json({
                request_id: requestDoc.$id,
                status: 'pending',
                message: 'Your visual explainer is being generated'
            });

        } catch (err) {
            error(err);
            return res.json({ error: 'Internal Server Error' }, 500);
        }
    }

    if (req.method === 'GET' && req.path.startsWith('/status/')) {
        const requestId = req.path.split('/status/')[1];
        try {
            const requestDoc = await databases.getDocument('database_id', 'requests', requestId);

            let result = null;
            if (requestDoc.status === 'complete') {
                // Fetch result from results collection
                // This assumes we have a way to link them, e.g. querying results by request_id
                const resultsList = await databases.listDocuments('database_id', 'results', [
                    // Query.equal('request_id', requestId) // hypothetical query syntax
                ]);
                if (resultsList.documents.length > 0) {
                     const resDoc = resultsList.documents[0];
                     result = {
                         paper_title: resDoc.paper_title,
                         paper_url: resDoc.paper_url,
                         image_url: resDoc.image_url, // or fetch from storage
                         summary: JSON.parse(resDoc.summary_json)
                     };
                }
            }

            return res.json({
                request_id: requestId,
                status: requestDoc.status,
                result: result
            });

        } catch (err) {
            return res.json({ error: 'Request not found' }, 404);
        }
    }

    return res.json({ message: 'Not Found' }, 404);
};
