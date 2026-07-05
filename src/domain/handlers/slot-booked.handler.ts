import { Inject, Logger } from '@nestjs/common';
import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import * as moment from 'moment';

import { SlotBookedEvent } from '../events/slot-booked.event';
import {
  AVAILABILITY_CACHE,
  AvailabilityCache,
} from '../ports/availability-cache.port';

@EventsHandler(SlotBookedEvent)
export class SlotBookedHandler implements IEventHandler<SlotBookedEvent> {
  private readonly logger = new Logger(SlotBookedHandler.name);

  constructor(
    @Inject(AVAILABILITY_CACHE)
    private cache: AvailabilityCache,
  ) {}

  handle(event: SlotBookedEvent) {
    const dateStr = moment(event.slot.datetime).format('YYYY-MM-DD');
    this.cache.removeSlot(event.clubId, event.courtId, dateStr, event.slot);
    this.logger.log(
      `Slot booked for club ${event.clubId}, court ${event.courtId} on ${dateStr} at ${event.slot.start}`,
    );
  }
}
