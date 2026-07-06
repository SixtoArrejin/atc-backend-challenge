import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { ClubUpdatedEvent } from '../events/club-updated.event';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';
import {
  AVAILABILITY_CACHE,
  AvailabilityCache,
} from '../ports/availability-cache.port';

@EventsHandler(ClubUpdatedEvent)
export class ClubUpdatedHandler implements IEventHandler<ClubUpdatedEvent> {
  private readonly logger = new Logger(ClubUpdatedHandler.name);

  constructor(
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private client: AlquilaTuCanchaClient,
    @Inject(AVAILABILITY_CACHE)
    private cache: AvailabilityCache,
  ) {}

  async handle(event: ClubUpdatedEvent) {
    this.logger.log(
      `Club ${event.clubId} updated (fields: ${event.fields.join(', ')})`,
    );

    if (
      event.fields.includes('openhours') ||
      event.fields.includes('open_hours' as any)
    ) {
      this.logger.log(
        `Invalidating cache for club ${event.clubId} due to openhours update`,
      );
      this.cache.invalidateClub(event.clubId);
      return;
    }

    try {
      const updatedClub = await this.client.getClub(event.clubId);
      this.cache.updateClubInfo(event.clubId, updatedClub);
    } catch (err) {
      this.logger.error(
        `Failed to refresh metadata for club ${event.clubId}: ${err.message}`,
      );
    }
  }
}
