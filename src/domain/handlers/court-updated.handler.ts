import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';

import { CourtUpdatedEvent } from '../events/court-updated.event';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';
import {
  AVAILABILITY_CACHE,
  AvailabilityCache,
} from '../ports/availability-cache.port';

@EventsHandler(CourtUpdatedEvent)
export class CourtUpdatedHandler implements IEventHandler<CourtUpdatedEvent> {
  private readonly logger = new Logger(CourtUpdatedHandler.name);

  constructor(
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private client: AlquilaTuCanchaClient,
    @Inject(AVAILABILITY_CACHE)
    private cache: AvailabilityCache,
  ) {}

  async handle(event: CourtUpdatedEvent) {
    this.logger.log(
      `Court ${event.courtId} of club ${
        event.clubId
      } updated (fields: ${event.fields.join(', ')})`,
    );
    this.cache.invalidateCourt(event.clubId, event.courtId);
    try {
      const updatedCourts = await this.client.getCourts(event.clubId);
      this.cache.setCourts(event.clubId, updatedCourts);
    } catch (err) {
      this.logger.error(
        `Failed to refresh courts for club ${event.clubId}: ${err.message}`,
      );
    }
  }
}
