import { db } from '../index';
import type { Relationship, EntityType, RelationshipType } from '../../shared/types';

export const relationshipsRepo = {
  async create(rel: Omit<Relationship, 'id'>): Promise<number> {
    return db.relationships.add(rel as Relationship);
  },

  async upsert(
    fromType: EntityType,
    fromId: number,
    toType: EntityType,
    toId: number,
    relType: RelationshipType,
    data: Partial<Relationship>,
  ): Promise<number> {
    const existing = await db.relationships
      .where('[from_entity_type+from_entity_id]')
      .equals([fromType, fromId])
      .filter(
        (r) =>
          r.to_entity_type === toType &&
          r.to_entity_id === toId &&
          r.relationship_type === relType,
      )
      .first();

    if (existing?.id) {
      await db.relationships.update(existing.id, data);
      return existing.id;
    }

    return db.relationships.add({
      from_entity_id: fromId,
      from_entity_type: fromType,
      to_entity_id: toId,
      to_entity_type: toType,
      relationship_type: relType,
      strength: data.strength || 0.5,
      explanation: data.explanation || '',
      created_at: Date.now(),
    });
  },

  async getForEntity(entityType: EntityType, entityId: number): Promise<Relationship[]> {
    const outgoing = await db.relationships
      .where('[from_entity_type+from_entity_id]')
      .equals([entityType, entityId])
      .toArray();
    const incoming = await db.relationships
      .where('[to_entity_type+to_entity_id]')
      .equals([entityType, entityId])
      .toArray();
    return [...outgoing, ...incoming];
  },

  async getAll(): Promise<Relationship[]> {
    return db.relationships.toArray();
  },

  async getByType(type: RelationshipType): Promise<Relationship[]> {
    return db.relationships.where('relationship_type').equals(type).toArray();
  },

  async deleteRelationship(id: number): Promise<void> {
    await db.relationships.delete(id);
  },

  async deleteForEntity(entityType: EntityType, entityId: number): Promise<void> {
    await db.relationships
      .where('[from_entity_type+from_entity_id]')
      .equals([entityType, entityId])
      .delete();
    await db.relationships
      .where('[to_entity_type+to_entity_id]')
      .equals([entityType, entityId])
      .delete();
  },

  async count(): Promise<number> {
    return db.relationships.count();
  },
};
