// ============================================================
// Dexie Database Instance
// ============================================================

import Dexie, { type Table } from 'dexie';
import type {
  Page,
  Session,
  Highlight,
  Topic,
  Category,
  Concept,
  Relationship,
  KnowledgeBox,
  DocumentChunk,
  Nebula,
  NebulaRun,
  Artifact,
} from '../shared/types';
import { SCHEMA_V1, SCHEMA_V2, SCHEMA_V3 } from './schema';
import { DB_NAME } from '../shared/constants';

export class BrowsingKnowledgeDB extends Dexie {
  pages!: Table<Page, number>;
  sessions!: Table<Session, number>;
  highlights!: Table<Highlight, number>;
  topics!: Table<Topic, number>;
  categories!: Table<Category, number>;
  concepts!: Table<Concept, number>;
  relationships!: Table<Relationship, number>;
  knowledgeBoxes!: Table<KnowledgeBox, number>;
  documentChunks!: Table<DocumentChunk, number>;
  nebulas!: Table<Nebula, number>;
  nebulaRuns!: Table<NebulaRun, number>;
  artifacts!: Table<Artifact, number>;

  constructor() {
    super(DB_NAME);
    this.version(1).stores(SCHEMA_V1);
    this.version(2).stores(SCHEMA_V2);
    this.version(3).stores(SCHEMA_V3);
  }
}

/** Singleton database instance */
export const db = new BrowsingKnowledgeDB();
