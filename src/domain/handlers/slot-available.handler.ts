import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import * as moment from 'moment';

import { SlotAvailableEvent } from '../events/slot-cancelled.event';
import {
  AVAILABILITY_CACHE,
  AvailabilityCache,
} from '../ports/availability-cache.port';

@EventsHandler(SlotAvailableEvent)
export class SlotAvailableHandler implements IEventHandler<SlotAvailableEvent> {
  private readonly logger = new Logger(SlotAvailableHandler.name);

  constructor(
    @Inject(AVAILABILITY_CACHE)
    private cache: AvailabilityCache,
  ) {}

  handle(event: SlotAvailableEvent) {
    const dateStr = moment(event.slot.datetime).format('YYYY-MM-DD');
    this.cache.addSlot(event.clubId, event.courtId, dateStr, event.slot);
    this.logger.log(
      `Slot released for club ${event.clubId}, court ${event.courtId} on ${dateStr} at ${event.slot.start}`,
    );
  }
}
