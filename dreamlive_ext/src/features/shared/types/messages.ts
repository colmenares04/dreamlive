export type MessageType = 
  | 'SAVE_LEAD'
  | 'LEAD_SAVED_CONFIRMATION'
  | 'ROTATE_KEYWORD'
  | 'COLLECTION_STOPPED'
  | 'STOP_CHECKING_UI'
  | 'BACKSTAGE_ALL_DONE'
  | 'CHECK_BATCH_ON_PAGE'
  | 'PROCESS_CONTACT_FLOW'
  | 'ABORT_CONTACT_FLOW'
  | 'ABORT_CHECKING_FLOW'
  | 'LIMIT_REACHED'
  | 'toggleRecopilacion'
  | 'GET_INVITATION_CONFIG'
  | 'BATCH_PROCESSED'
  | 'MARK_CONTACTED'
  | 'DELETE_LEAD'
  | 'LEAD_CONTACTED_SUCCESS'
  | 'GET_BATCH_TO_CHECK'
  | 'NAVIGATE'
  | 'START_CHECKING_FLOW'
  | 'BACKSTAGE_SCRIPT_READY'
  | 'MESSAGES_PAGE_READY'
  | 'SAVE_INVITATION_CONFIG'
  | 'SAVE_MESSAGE_TEMPLATES'
  | 'START_CONTACTING'
  | 'STOP_CONTACTING'
  | 'KEYWORDS_UPDATED'
  | 'KEYWORD_CHANGED'
  | 'GET_LEADS_FOR_CONTACTING';

export interface BaseMessage {
  type: MessageType;
}

export interface NavigateMessage extends BaseMessage {
  type: 'NAVIGATE';
  url: string;
}

export interface SaveLeadMessage extends BaseMessage {
  type: 'SAVE_LEAD';
  username: string;
  viewers: number;
  likes: number;
  source: string;
}

export interface ToggleRecopilacionMessage extends BaseMessage {
  type: 'toggleRecopilacion';
  status: boolean;
}

export interface CheckBatchMessage extends BaseMessage {
  type: 'CHECK_BATCH_ON_PAGE';
  users: string[];
}

export interface ProcessContactFlowMessage extends BaseMessage {
  type: 'PROCESS_CONTACT_FLOW';
  leads: string[];
  templates: string[];
  targetSuccessCount: number;
}

export interface LimitReachedMessage extends BaseMessage {
  type: 'LIMIT_REACHED';
  count: number;
  limit: number;
  resetIn?: string;
}

export interface GetInvitationConfigMessage extends BaseMessage {
  type: 'GET_INVITATION_CONFIG';
}

export interface BatchProcessedMessage extends BaseMessage {
  type: 'BATCH_PROCESSED';
  disponibles: string[];
  procesados: string[];
}

export interface MarkContactedMessage extends BaseMessage {
  type: 'MARK_CONTACTED';
  username: string;
}

export interface DeleteLeadMessage extends BaseMessage {
  type: 'DELETE_LEAD';
  username: string;
}

export interface GetBatchToCheckMessage extends BaseMessage {
  type: 'GET_BATCH_TO_CHECK';
  tag?: string;
}

export interface SaveInvitationConfigMessage extends BaseMessage {
  type: 'SAVE_INVITATION_CONFIG';
  invitation_types: string[];
}

export interface SaveMessageTemplatesMessage extends BaseMessage {
  type: 'SAVE_MESSAGE_TEMPLATES';
  message_templates: string[];
}

export type ExtensionMessage = 
  | BaseMessage 
  | NavigateMessage
  | SaveLeadMessage 
  | ToggleRecopilacionMessage
  | CheckBatchMessage
  | ProcessContactFlowMessage
  | LimitReachedMessage
  | GetInvitationConfigMessage
  | BatchProcessedMessage
  | MarkContactedMessage
  | DeleteLeadMessage
  | GetBatchToCheckMessage
  | SaveInvitationConfigMessage
  | SaveMessageTemplatesMessage
  | KeywordsUpdatedMessage
  | KeywordChangedMessage;

export interface KeywordsUpdatedMessage extends BaseMessage {
  type: 'KEYWORDS_UPDATED';
  payload: string[];
}

export interface KeywordChangedMessage extends BaseMessage {
  type: 'KEYWORD_CHANGED';
  payload: string;
}
