# Unkey API Key Management Setup

This project now uses [Unkey](https://unkey.dev) for API key management instead of a custom solution.

## Required Environment Variables

Add the following environment variables to your Convex deployment:

```bash
# Unkey Configuration
UNKEY_ROOT_KEY=your_unkey_root_key_here
UNKEY_API_ID=your_unkey_api_id_here
```

## Getting Your Unkey Credentials

1. **Sign up for Unkey**: Visit [https://unkey.dev](https://unkey.dev) and create an account

2. **Create an API**:
   - Go to your Unkey dashboard
   - Create a new API (this will be your UNKEY_API_ID)
   - Copy the API ID

3. **Generate a Root Key**:
   - Navigate to Settings > Root Keys
   - Create a new root key with the following permissions:
     - `api.*.create_key`
     - `api.*.read_key`
     - `api.*.delete_key`
     - `api.*.verify_key`
   - Copy the root key (this will be your UNKEY_ROOT_KEY)
   - **Important**: Store this securely, it won't be shown again

## Setting Environment Variables in Convex

```bash
# Set the environment variables
npx convex env set UNKEY_ROOT_KEY your_unkey_root_key_here
npx convex env set UNKEY_API_ID your_unkey_api_id_here
```

## How It Works

### API Key Creation

When a user creates an API key through the dashboard:
1. The system calls Unkey's API to create a new key
2. Unkey generates a secure key and returns it along with a key ID
3. The key ID is stored in the database along with workspace and project references
4. The actual key is shown to the user only once
5. Metadata (workspaceId, projectId, projectName) is attached to the key in Unkey

### API Key Verification

When a request comes in with an API key:
1. The system calls Unkey's verification API
2. Unkey validates the key and returns metadata if valid
3. The metadata contains workspace and project information
4. The request is authorized based on this metadata

### API Key Deletion

When a user deletes an API key:
1. The system calls Unkey's API to revoke the key
2. The key is deleted from the local database
3. The key immediately stops working

## Benefits of Using Unkey

- **Security**: Keys are managed by a dedicated service with built-in security features
- **Scalability**: Unkey handles rate limiting and analytics
- **Reliability**: Unkey provides fast, global key verification
- **Features**: Get access to key rotation, expiration, rate limiting, and more out of the box

## Migration Notes

The database schema has been updated:
- `apiKeys.keyHash` → `apiKeys.unkeyKeyId`
- The `by_key_hash` index → `by_unkey_id` index

Existing keys in the database will need to be migrated or recreated through the new Unkey system.
