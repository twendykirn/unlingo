import { Id } from '@/convex/_generated/dataModel';

export interface NamespaceVersion {
    namespaceId: Id<'namespaces'>;
    versionId: Id<'namespaceVersions'>;
    namespaceName: string;
    versionName: string;
}
