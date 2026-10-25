export type ID = string;
export type HouseholdRole = 'owner' | 'admin' | 'member' | 'viewer';
export interface Actor { userId: ID; householdId: ID; role: HouseholdRole }
export interface Page<T> { items: T[]; nextCursor?: string }
export interface ApiError { code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION' | 'CONFLICT' | 'UNAVAILABLE'; message: string }
export interface AuditFields { id: ID; createdAt: string; updatedAt: string }
export interface PetProfile extends AuditFields { householdId: ID; name: string; species: 'dog' | 'cat' | 'other'; breed?: string; birthDate?: string; dietaryNotes?: string }
export interface Place extends AuditFields { name: string; category: string; latitude: number; longitude: number; policyVerifiedAt?: string; policySource?: string }
export interface Trip extends AuditFields { householdId: ID; title: string; startsOn?: string; endsOn?: string }
export interface MysteryBoxPreference { householdId: ID; petId: ID; theme: string; cadence: 'one_time' | 'monthly' | 'quarterly'; toysOnly: boolean; restrictions: string[] }
export interface BirdProfile extends AuditFields { householdId: ID; flockId: ID; name: string; breed?: string; hatchDate?: string; status: 'active' | 'rehomed' | 'deceased' }
export interface EggCollection extends AuditFields { householdId: ID; flockId: ID; collectedOn: string; count: number; notes?: string }
export interface ChoreOccurrence extends AuditFields { householdId: ID; title: string; dueAt: string; completedAt?: string; assignedTo?: ID }

// ---------------------------------------------------------------------------
// Fresh Eggs Daily flock domain (phase 1). Dates without a time are local
// calendar days formatted YYYY-MM-DD (DateKey). Every household-scoped record
// carries householdId so a future backend can enforce tenant isolation.
// ---------------------------------------------------------------------------
export type DateKey = string;

/** Records created by "Load sample flock" carry sample: true so they can be removed. */
export interface Sampleable { sample?: boolean }

export interface Household extends AuditFields { name: string }

export interface Flock extends AuditFields, Sampleable { householdId: ID; name: string; coopName?: string; notes?: string }

export type BirdStatus = BirdProfile['status'];
export interface BirdProfileDetails { color?: string; photo?: string; notes?: string }
export type Bird = BirdProfile & BirdProfileDetails & Sampleable;

export type HealthEventType = 'deworming' | 'mites_lice_check' | 'injury' | 'molt' | 'vaccination' | 'vet_visit' | 'quarantine' | 'other';
export interface BirdHealthEvent extends AuditFields, Sampleable {
  householdId: ID; flockId: ID; birdId?: ID; type: HealthEventType; occurredOn: DateKey; notes?: string;
  /** Quarantine end date. */
  endsOn?: DateKey;
  /** Optional follow-up reminder date (next deworming, recheck, etc). */
  remindOn?: DateKey;
  reminderDone?: boolean;
}

export interface EggLog extends EggCollection, Sampleable { birdId?: ID; damaged?: number }

export type EggDispositionKind = 'sold' | 'given' | 'used';
/** egg_inventory: eggs leaving the household stock. */
export interface EggDisposition extends AuditFields, Sampleable {
  householdId: ID; occurredOn: DateKey; kind: EggDispositionKind; count: number; amount?: number; customer?: string; notes?: string;
}

export type CostCategory = 'feed' | 'bedding' | 'vet' | 'equipment' | 'other';
export interface FlockCost extends AuditFields, Sampleable { householdId: ID; occurredOn: DateKey; category: CostCategory; amount: number; notes?: string }

export type ChoreRecurrence = 'daily' | 'weekly' | 'monthly' | 'seasonal';
export interface ChoreTemplate extends AuditFields { householdId: ID; title: string; recurrence: ChoreRecurrence; startDate: DateKey; active: boolean; builtIn?: boolean }
export interface ChoreDone extends ChoreOccurrence { templateId: ID; /** dueAt holds the DateKey the chore was due. */ }

export type FeedCategory = 'feed' | 'treats' | 'bedding' | 'supplement' | 'grit' | 'other';
export interface FeedItem extends AuditFields, Sampleable {
  householdId: ID; name: string; category: FeedCategory; unit: string;
  /** Quantity on hand as of countedOn. */
  quantity: number; countedOn: DateKey; dailyUsage: number; lowStockDays: number;
}
export interface FeedLog extends AuditFields, Sampleable { householdId: ID; itemId: ID; occurredOn: DateKey; kind: 'restock' | 'recount' | 'use'; amount: number; notes?: string }

export interface IncubationBatch extends AuditFields, Sampleable { householdId: ID; name: string; setOn: DateKey; eggCount: number; notes?: string }
export interface HatchEvent extends AuditFields, Sampleable { householdId: ID; batchId: ID; recordedOn: DateKey; hatched: number; unhatched: number; notes?: string }

export interface Article { slug: string; title: string; topic: 'Chicks' | 'Eggs' | 'Seasons' | 'Coop' | 'Health' | 'Flock'; minutes: number; problem: string; why: string; steps: string[]; getHelp?: string }
export interface Recipe { slug: string; title: string; summary: string; serves: string; minutes: number; eggs: number; ingredients: string[]; steps: string[] }
export interface ShopCategory { slug: string; title: string; blurb: string; url: string }

export type ReminderKind = 'chore' | 'care' | 'feed' | 'incubation';
export interface Reminder { id: string; kind: ReminderKind; title: string; detail: string; href: string; overdue: boolean }

/** Every persisted household-scoped collection, keyed by table name. */
export interface CollectionMap {
  flocks: Flock; birds: Bird; bird_health_events: BirdHealthEvent; egg_collections: EggLog; egg_inventory: EggDisposition;
  flock_costs: FlockCost; chore_templates: ChoreTemplate; chore_occurrences: ChoreDone; feed_inventory: FeedItem; feed_logs: FeedLog;
  incubation_batches: IncubationBatch; hatch_events: HatchEvent;
}
export type CollectionName = keyof CollectionMap;
export const COLLECTIONS: CollectionName[] = [
  'flocks', 'birds', 'bird_health_events', 'egg_collections', 'egg_inventory', 'flock_costs', 'chore_templates',
  'chore_occurrences', 'feed_inventory', 'feed_logs', 'incubation_batches', 'hatch_events',
];

export interface BackupFile { app: 'fresh-eggs-daily'; version: 1; exportedAt: string; household: Household; collections: { [K in CollectionName]: CollectionMap[K][] } }
