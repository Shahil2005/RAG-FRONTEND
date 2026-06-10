export type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

export type VectorSource =
  | 'outlook'
  | 'sharepoint'
  | 'onedrive'
  | 'project'
  | 'external'
  | `${string}-workspace`;

export type QueryIntent =
  | 'off_topic'
  | 'm365_only'
  | 'business_research'
  | 'hybrid'
  | 'document_generation';

export type DocumentTemplateType =
  | 'estimate'
  | 'job_summary'
  | 'report'
  | 'quotation'
  | 'customer_email';

export interface TemplateVariable {
  key: string;
  label: string;
  required?: boolean;
  example?: string;
}

export interface DocumentTemplate {
  id: string;
  organization_id: string;
  workspace_id: string | null;
  name: string;
  type: DocumentTemplateType;
  content: string;
  variables: TemplateVariable[];
  is_default?: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Marker attached to an assistant chat message when the bot generated a document.
 * Lets the chat UI offer follow-up actions (e.g. "Save to Outlook drafts" for an
 * emitted customer email).
 */
export interface DocumentDraft {
  type: DocumentTemplateType;
  templateName: string;
  /** Subject line for customer_email drafts. */
  subject?: string;
  /** The generated document body (markdown / plain text). */
  body: string;
  /** True when this draft can be saved straight to the user's Outlook Drafts. */
  canSaveToOutlook?: boolean;
}

export type EmailCategory = 'important' | 'spam' | 'closed' | 'pending_action' | 'sent';

export interface VectorMetadata {
  source: VectorSource;
  organizationId: string;
  workspaceId?: string;
  projectId?: string;
  sectorId?: string;
  emailId?: string;
  fileId?: string;
  fileName?: string;
  sender?: string;
  timestamp?: string;
  chunkId: string;
  subject?: string;
  webUrl?: string;
}

export interface Citation {
  index: number;
  source: VectorSource;
  title: string;
  snippet: string;
  url?: string;
  timestamp?: string;
}

export interface RetrievedChunk {
  id: string;
  content: string;
  score: number;
  metadata: VectorMetadata;
}

export interface UnifiedSearchRequest {
  query: string;
  workspaceId?: string;
  projectId?: string;
  sources?: VectorSource[];
  topK?: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  custom_instructions: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectSector {
  id: string;
  project_id: string;
  name: string;
  created_at: string;
}

export interface ProjectFileSummary {
  id: string;
  project_id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  is_indexed: boolean;
  indexed_at: string | null;
  index_reason: string | null;
  chunk_count: number;
  sector_id: string | null;
  created_at: string;
}

export interface ProjectDetail extends ProjectSummary {
  files: ProjectFileSummary[];
  sectors: ProjectSector[];
}

export interface ExternalResearchChunk {
  id: string;
  index: number;
  title: string;
  content: string;
  url: string;
  source: 'external';
}

export interface UnifiedSearchResponse {
  answer: string;
  citations: Citation[];
  internalResults: RetrievedChunk[];
  externalResults?: ExternalResearchChunk[];
  intent?: QueryIntent;
  usedExternalSearch?: boolean;
}

export interface GenerateDocumentRequest {
  templateId: string;
  variables: Record<string, string>;
  workspaceId?: string;
}

export interface MailClassificationResult {
  emailId: string;
  graphMessageId: string;
  subject: string;
  category: EmailCategory;
  confidence: number;
  reasoning?: string;
}

/** Row returned by GET /mail/classifications */
export interface MailClassificationRow {
  id: string;
  category: EmailCategory;
  confidence: number;
  reasoning: string | null;
  created_at: string;
  email_metadata: {
    subject: string;
    sender: string;
    received_at: string;
  };
}

export interface AuthContext {
  userId: string;
  email?: string;
  organizationId: string;
  role: MemberRole;
}

export interface IngestionJobPayload {
  source: 'outlook' | 'sharepoint' | 'onedrive' | 'workspace';
  userId: string;
  organizationId: string;
  workspaceId?: string;
  since?: string;
}

export interface EmbedRequest {
  texts: string[];
}

export interface EmbedResponse {
  embeddings: number[][];
  model: string;
  dimensions: number;
}

export interface RagQueryResponse {
  answer: string;
  citations: Citation[];
  chunks: RetrievedChunk[];
  externalResults?: ExternalResearchChunk[];
  intent?: QueryIntent;
  usedExternalSearch?: boolean;
  scopeReason?: string;
  emptyReason?: 'out_of_scope' | 'no_indexed_data' | 'not_connected';
  /** Present when the bot generated a document from a stored template. */
  documentDraft?: DocumentDraft;
}

export interface ChatSessionSummary {
  id: string;
  title: string | null;
  workspace_id: string | null;
  project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessageRecord {
  id: string;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations?: Citation[] | null;
  created_at: string;
}

export interface OutlookSyncResult {
  indexed: number;
  skipped: number;
  vectorsUpserted: number;
  emailsFetched: number;
  namespace: string;
  pineconeIndexName: string;
}

export interface DocumentSourceSyncResult {
  indexed: number;
  skipped: number;
  vectorsUpserted: number;
  filesFetched: number;
  namespace: string;
  pineconeIndexName: string;
}

export interface DocumentsSyncResult {
  sharepoint: DocumentSourceSyncResult;
  onedrive: DocumentSourceSyncResult;
}

export interface IngestionStatus {
  organizationId: string;
  pineconeIndexName: string;
  pineconeNamespace: string;
  pineconeVectorCount: number | null;
  emailMetadataCount: number;
  indexedEmailCount: number;
  fileMetadataCount: number;
  indexedFileCount: number;
  lastOutlookSyncAt: string | null;
  lastDocumentsSyncAt: string | null;
  lastOutlookSyncError: string | null;
  lastDocumentsSyncError: string | null;
  metadataOnlyFileCount: number;
  aiServiceReachable: boolean;
  /** True when WORKER_SERVICE_TOKEN is configured on the API. */
  scheduledSyncEnabled: boolean;
  /** Milliseconds between worker scheduler ticks (INGESTION_SYNC_INTERVAL_MS). */
  scheduledSyncIntervalMs: number;
  /** Estimated next worker sync from last successful sync + interval (null if never synced). */
  estimatedNextScheduledSyncAt: string | null;
  verification: {
    checkNamespaceInPineconeConsole: string;
    expectedDimensions: number;
  };
}

