import { Client, Databases, Functions, ID, Query } from 'node-appwrite'

// Environment variables (provided by Appwrite Function runtime)
const {
  APPWRITE_FUNCTION_PROJECT_ID,
  APPWRITE_FUNCTION_API_ENDPOINT,
  APPWRITE_FUNCTION_JWT,
  APPWRITE_API_KEY,
  DATABASE_ID = 'mitate-db',
  WORKER_FUNCTION_ID, // ID of the process-generation worker function
} = process.env

export default async ({ req, res, log, error }) => {
  try {
    log(`Function started. Method: ${req.method}, Path: ${req.path}`)
    log(`Project ID: ${APPWRITE_FUNCTION_PROJECT_ID}`)
    log(
      `Endpoint: ${APPWRITE_FUNCTION_API_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1'}`,
    )
    log(
      `Has JWT: ${!!APPWRITE_FUNCTION_JWT}, Has API Key: ${!!APPWRITE_API_KEY}`,
    )

    const client = new Client()
      .setEndpoint(
        APPWRITE_FUNCTION_API_ENDPOINT || 'https://nyc.cloud.appwrite.io/v1',
      )
      .setProject(APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(APPWRITE_API_KEY)

    const databases = new Databases(client)
    const functions = new Functions(client)

    // ============================================================
    // POST / - Create new generation request
    // ============================================================
    if (req.method === 'POST' && req.path === '/') {
      try {
        let payload
        try {
          payload = JSON.parse(req.body || '{}')
        } catch (parseError) {
          return res.json({ error: 'Invalid JSON in request body' }, 400)
        }

        const { query, knowledge_level } = payload

        // Validation
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
          return res.json({ error: 'Missing or invalid "query" field' }, 400)
        }

        if (
          !['beginner', 'intermediate', 'advanced'].includes(knowledge_level)
        ) {
          return res.json(
            {
              error:
                'Invalid "knowledge_level". Must be: beginner, intermediate, or advanced',
            },
            400,
          )
        }

        // Determine query type (arxiv link vs topic search)
        const query_type = query.includes('arxiv.org') ? 'arxiv_link' : 'topic'

        log(
          `Creating request: query="${query}", level="${knowledge_level}", type="${query_type}"`,
        )

        // Create request document in database
        const requestDoc = await databases.createDocument(
          DATABASE_ID,
          'requests',
          ID.unique(),
          {
            query: query.trim(),
            query_type,
            knowledge_level,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        )

        log(`Request created with ID: ${requestDoc.$id}`)

        // Trigger background worker function asynchronously
        if (WORKER_FUNCTION_ID) {
          try {
            await functions.createExecution(
              WORKER_FUNCTION_ID,
              JSON.stringify({ requestId: requestDoc.$id }),
              true, // async execution
              '/',
              'POST',
            )
            log(`Triggered worker function for request ${requestDoc.$id}`)
          } catch (workerError) {
            error(`Failed to trigger worker function: ${workerError.message}`)
            // Don't fail the request - worker can be triggered by other means
          }
        } else {
          log(
            'WARNING: WORKER_FUNCTION_ID not set, background processing not triggered',
          )
        }

        return res.json(
          {
            request_id: requestDoc.$id,
            status: 'pending',
            message: 'Your visual explainer is being generated',
          },
          200,
        )
      } catch (err) {
        error(`Error creating request: ${err.message}`)
        return res.json(
          {
            error: 'Internal server error while creating request',
            details: err.message,
          },
          500,
        )
      }
    }

    // ============================================================
    // GET /?requestId=xxx - Get generation status
    // ============================================================
    if (req.method === 'GET') {
      try {
        // Parse query parameters
        const url = new URL(
          req.url,
          `http://${req.headers.host || 'localhost'}`,
        )
        const requestId = url.searchParams.get('requestId')

        if (!requestId) {
          return res.json({ error: 'Missing "requestId" query parameter' }, 400)
        }

        log(`Checking status for request: ${requestId}`)

        // Fetch request document
        let requestDoc
        try {
          requestDoc = await databases.getDocument(
            DATABASE_ID,
            'requests',
            requestId,
          )
        } catch (notFoundError) {
          error(`Error fetching document: ${notFoundError.message}`)
          error(`Error code: ${notFoundError.code}`)
          error(`Error type: ${notFoundError.type}`)
          return res.json(
            {
              error: 'Request not found',
              request_id: requestId,
            },
            404,
          )
        }

        const response = {
          request_id: requestId,
          status: requestDoc.status,
          message: getStatusMessage(requestDoc.status),
        }

        // If complete, fetch result
        if (requestDoc.status === 'complete') {
          try {
            const results = await databases.listDocuments(
              DATABASE_ID,
              'results',
              [Query.equal('request_id', requestId)],
            )

            if (results.documents.length > 0) {
              const resultDoc = results.documents[0]
              const summary = JSON.parse(resultDoc.summary_json)

              response.result = {
                paper_title: resultDoc.paper_title,
                paper_url: resultDoc.paper_url,
                // Try to get image_url from the field, or fall back to summary object
                image_url: resultDoc.image_url || summary.image_url || null,
                summary: summary,
              }
            } else {
              log(
                `WARNING: Request marked complete but no result found for ${requestId}`,
              )
            }
          } catch (resultError) {
            error(`Error fetching result: ${resultError.message}`)
          }
        }

        // If failed, include error message
        if (requestDoc.status === 'failed' && requestDoc.error) {
          response.error = requestDoc.error
        }

        return res.json(response, 200)
      } catch (err) {
        error(`Error checking status: ${err.message}`)
        return res.json(
          {
            error: 'Internal server error while checking status',
            details: err.message,
          },
          500,
        )
      }
    }

    // ============================================================
    // Unsupported method/path
    // ============================================================
    return res.json(
      {
        error: 'Not found',
        supported_endpoints: [
          'POST / - Create generation request',
          'GET /?requestId=xxx - Check request status',
        ],
      },
      404,
    )
  } catch (err) {
    error(`Top-level error: ${err.message}`)
    error(`Stack: ${err.stack}`)
    return res.json(
      {
        error: 'Function execution failed',
        details: err.message,
        stack: err.stack,
      },
      500,
    )
  }
}

/**
 * Get user-friendly status message
 */
function getStatusMessage(status) {
  const messages = {
    pending: 'Request received, starting processing...',
    finding_paper: 'Finding relevant papers on ArXiv...',
    summarizing: 'Reading and summarizing the paper...',
    generating_image: 'Generating your visual infographic...',
    complete: 'Generation complete!',
    failed: 'Generation failed. Please try again.',
  }
  return messages[status] || 'Processing...'
}
