/**
 * Constantes globales de configuración para la extensión
 */
export const SCRAPER_BATCH_SIZE = 5;
export const SCRAPER_DEFAULT_TAGS = ["Normal", "Elite", "Popular", "Premium"];

// Eventos y Tipos de Mensajes
export const MESSAGES = {
    GET_BATCH_TO_CHECK: "GET_BATCH_TO_CHECK",
    BATCH_PROCESSED: "BATCH_PROCESSED",
    SAVE_INVITATION_CONFIG: "SAVE_INVITATION_CONFIG",
    GET_INVITATION_CONFIG: "GET_INVITATION_CONFIG"
};

// Selectores del DOM de TikTok
export const DOM_SELECTORS = {
    TEXTAREA_SEARCH: 'textarea[data-testid="inviteHostTextArea"]',
    BACK_BUTTON: 'button[data-id="invite-host-back"]',
    INVITE_BUTTON: 'button[data-id="add-host"], button[data-e2e-tag="host_manageRelationship_addHostBtn"]',
    TABLE_ROW: '.semi-table-row',
    ROWS: 'tr[role="row"], tr.semi-table-row',
    USER_CELL: 'td[aria-colindex="1"], td:first-child',
    STATUS_CELL: 'td[aria-colindex="2"], td:nth-child(2)',
    TYPE_CELL: 'td[aria-colindex="3"], td:nth-child(3)'
};

// Delays y Tiempos de espera (en ms)
export const SCRAPER_DELAYS = {
    BETWEEN_BATCHES: 3000,
    TABLE_LOAD: 4500,
    BEFORE_PASTE: 500,
    AFTER_PASTE: 1500,
    AFTER_BACK: 2500,
    AFTER_INVITE: 2500,
    TABLE_WAIT_CHECK: 10000,
    TEXTAREA_WAIT: 8000
};

// Clases de CSS o identificadores de TikTok
export const SCRAPER_STATUS_MARKERS = {
    ONLINE: 'semi-tag-green-light',
    FORBIDDEN: 'semi-tag-red-light'
};

export const SCRAPER_CREATOR_TYPES = {
    ELITE: { color: "#FF9506", name: "Elite" },
    POPULAR: { color: "#836BFE", name: "Popular" },
    PREMIUM: { color: "#2CB8C5", name: "Premium" },
    NORMAL: { color: "default", name: "Normal" }
};
