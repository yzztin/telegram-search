import type { Entity } from 'telegram/define'

import { Api } from 'telegram'

type EntityType = 'user' | 'group' | 'channel' | 'unknown'
interface EntityInfo { id: number, type: EntityType, name: string }

export function getEntityInfo(entity: Entity): EntityInfo {
  if (entity instanceof Api.User) {
    return {
      id: entity.id.toJSNumber(),
      type: 'user',
      name: [entity.firstName, entity.lastName].filter(Boolean).join(' ')
        || entity.username
        || 'Unknown User',
    }
  }
  else if (entity instanceof Api.Chat) {
    return {
      id: entity.id.toJSNumber(),
      type: 'group',
      name: entity.title,
    }
  }
  else if (entity instanceof Api.Channel) {
    return {
      id: entity.id.toJSNumber(),
      type: 'channel',
      name: entity.title,
    }
  }

  return { id: 0, type: 'unknown', name: 'Unknown' }
}
