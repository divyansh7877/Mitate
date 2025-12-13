/**
 * Appwrite Database Setup Script
 *
 * This script programmatically creates the required database collections
 * and storage bucket for the Mitate project.
 *
 * Prerequisites:
 * 1. Create an Appwrite project at https://cloud.appwrite.io
 * 2. Create an API key with the following scopes:
 *    - databases.write
 *    - collections.write
 *    - attributes.write
 *    - storage.write
 * 3. Fill in your .env file with APPWRITE_ENDPOINT and APPWRITE_PROJECT_ID
 * 4. Run: bun add node-appwrite (if not already installed)
 *
 * Usage:
 * bun run scripts/setup-appwrite.ts
 */

import { Client, Databases, Storage, Permission, Role } from 'node-appwrite'

// Load environment variables
const APPWRITE_ENDPOINT =
  process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1'
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY

if (!APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  console.error('❌ Missing required environment variables:')
  console.error('   APPWRITE_PROJECT_ID')
  console.error('   APPWRITE_API_KEY')
  console.error('\nPlease set these in your .env file and try again.')
  process.exit(1)
}

// Initialize Appwrite client
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setKey(APPWRITE_API_KEY)

const databases = new Databases(client)
const storage = new Storage(client)

const DATABASE_ID = 'mitate-db'
const BUCKET_ID = 'poster-images'

async function createDatabase() {
  try {
    console.log('📦 Creating database...')
    const database = await databases.create({
      databaseId: DATABASE_ID,
      name: 'Mitate Database',
    })
    console.log('✅ Database created:', database.name)
    return database.$id
  } catch (error: any) {
    if (error.code === 409) {
      console.log('ℹ️  Database already exists, using existing one')
      return DATABASE_ID
    }
    throw error
  }
}

async function createRequestsCollection(databaseId: string) {
  try {
    console.log('\n📋 Creating "requests" collection...')
    const collection = await databases.createCollection({
      databaseId,
      collectionId: 'requests',
      name: 'Requests',
      permissions: [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
    })

    // Create attributes
    console.log('   Adding attributes...')

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'user_id',
      size: 255,
      required: false,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'query',
      size: 1000,
      required: true,
    })

    await databases.createEnumAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'query_type',
      elements: ['topic', 'arxiv_link'],
      required: true,
    })

    await databases.createEnumAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'knowledge_level',
      elements: ['beginner', 'intermediate', 'advanced'],
      required: true,
    })

    await databases.createEnumAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'status',
      elements: [
        'pending',
        'finding_paper',
        'summarizing',
        'generating_image',
        'complete',
        'failed',
      ],
      required: true,
      default: 'pending',
    })

    await databases.createDatetimeAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'created_at',
      required: true,
    })

    await databases.createDatetimeAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'updated_at',
      required: true,
    })

    console.log('✅ "requests" collection created')
  } catch (error: any) {
    if (error.code === 409) {
      console.log('ℹ️  "requests" collection already exists')
    } else {
      throw error
    }
  }
}

async function createResultsCollection(databaseId: string) {
  try {
    console.log('\n📋 Creating "results" collection...')
    const collection = await databases.createCollection({
      databaseId,
      collectionId: 'results',
      name: 'Results',
      permissions: [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
    })

    console.log('   Adding attributes...')

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'request_id',
      size: 255,
      required: true,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'arxiv_id',
      size: 255,
      required: true,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'paper_title',
      size: 500,
      required: true,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'paper_url',
      size: 500,
      required: true,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'summary_json',
      size: 16384,
      required: true,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'fibo_structured_prompt',
      size: 16384,
      required: true,
    })

    await databases.createIntegerAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'fibo_seed',
      required: true,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'image_url',
      size: 500,
      required: false,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'image_storage_id',
      size: 255,
      required: false,
    })

    await databases.createDatetimeAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'created_at',
      required: true,
    })

    await databases.createDatetimeAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'updated_at',
      required: true,
    })

    console.log('✅ "results" collection created')
  } catch (error: any) {
    if (error.code === 409) {
      console.log('ℹ️  "results" collection already exists')
    } else {
      throw error
    }
  }
}

async function createPosterGenerationsCollection(databaseId: string) {
  try {
    console.log('\n📋 Creating "poster_generations" collection...')
    const collection = await databases.createCollection({
      databaseId,
      collectionId: 'poster_generations',
      name: 'Poster Generations',
      permissions: [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
    })

    console.log('   Adding attributes...')

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'request_id',
      size: 255,
      required: true,
    })

    await databases.createEnumAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'status',
      elements: ['pending', 'processing', 'complete', 'failed'],
      required: true,
      default: 'pending',
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'input_summary',
      size: 65535,
      required: true,
    })

    await databases.createEnumAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'knowledge_level',
      elements: ['beginner', 'intermediate', 'advanced'],
      required: true,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'fibo_structured_prompt',
      size: 65535,
      required: false,
    })

    await databases.createIntegerAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'fibo_seed',
      required: false,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'fal_layout_urls',
      size: 16384,
      required: false,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'fal_icon_urls',
      size: 16384,
      required: false,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'final_image_url',
      size: 2000,
      required: false,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'variation_urls',
      size: 16384,
      required: false,
    })

    await databases.createIntegerAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'generation_time_ms',
      required: false,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'user_preferences',
      size: 16384,
      required: false,
    })

    await databases.createStringAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'error',
      size: 1000,
      required: false,
    })

    await databases.createDatetimeAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'created_at',
      required: true,
    })

    await databases.createDatetimeAttribute({
      databaseId,
      collectionId: collection.$id,
      key: 'updated_at',
      required: true,
    })

    console.log('✅ "poster_generations" collection created')
  } catch (error: any) {
    if (error.code === 409) {
      console.log('ℹ️  "poster_generations" collection already exists')
    } else {
      throw error
    }
  }
}

async function createStorageBucket() {
  try {
    console.log('\n🗄️  Creating storage bucket...')
    const bucket = await storage.createBucket({
      bucketId: BUCKET_ID,
      name: 'Poster Images',
      permissions: [
        Permission.read(Role.any()),
        Permission.create(Role.users()),
        Permission.update(Role.users()),
        Permission.delete(Role.users()),
      ],
      fileSecurity: false,
      enabled: true,
      maximumFileSize: 30000000, // 30MB
      allowedFileExtensions: ['png', 'jpg', 'jpeg', 'webp'],
      compression: 'none',
      encryption: true,
      antivirus: true,
    })
    console.log('✅ Storage bucket created:', bucket.name)
  } catch (error: any) {
    if (error.code === 409) {
      console.log('ℹ️  Storage bucket already exists')
    } else {
      throw error
    }
  }
}

async function updateEnvFile(databaseId: string) {
  console.log('\n📝 Updating .env file...')
  const fs = await import('fs')
  const path = await import('path')

  const envPath = path.join(process.cwd(), '.env')
  let envContent = fs.readFileSync(envPath, 'utf-8')

  // Update DATABASE_ID
  if (envContent.includes('APPWRITE_DATABASE_ID=')) {
    envContent = envContent.replace(
      /APPWRITE_DATABASE_ID=.*/,
      `APPWRITE_DATABASE_ID=${databaseId}`,
    )
  } else {
    envContent += `\nAPPWRITE_DATABASE_ID=${databaseId}`
  }

  // Update BUCKET_ID
  if (envContent.includes('APPWRITE_BUCKET_ID=')) {
    envContent = envContent.replace(
      /APPWRITE_BUCKET_ID=.*/,
      `APPWRITE_BUCKET_ID=${BUCKET_ID}`,
    )
  } else {
    envContent += `\nAPPWRITE_BUCKET_ID=${BUCKET_ID}`
  }

  fs.writeFileSync(envPath, envContent)
  console.log('✅ .env file updated')
}

async function main() {
  console.log('🚀 Starting Appwrite setup...\n')
  console.log(`Endpoint: ${APPWRITE_ENDPOINT}`)
  console.log(`Project ID: ${APPWRITE_PROJECT_ID}\n`)

  try {
    // Create database
    const databaseId = await createDatabase()

    // Create collections
    await createRequestsCollection(databaseId)
    await createResultsCollection(databaseId)
    await createPosterGenerationsCollection(databaseId)

    // Create storage bucket
    await createStorageBucket()

    // Update .env file
    await updateEnvFile(databaseId)

    console.log('\n✨ Setup complete!\n')
    console.log('Next steps:')
    console.log('1. Verify your collections at https://cloud.appwrite.io')
    console.log('2. Add your FIBO_API_KEY and FAL_KEY to .env')
    console.log('3. Start building your application!\n')
  } catch (error) {
    console.error('\n❌ Setup failed:', error)
    process.exit(1)
  }
}

main()
