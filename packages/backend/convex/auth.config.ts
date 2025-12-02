export default {
    providers: [
        {
            // WorkOS JWT issuer domain
            // Configure WORKOS_CLIENT_ID on the Convex Dashboard
            // The domain is based on the WorkOS API endpoint
            domain: 'https://api.workos.com',
            applicationID: process.env.WORKOS_CLIENT_ID,
        },
    ],
};
