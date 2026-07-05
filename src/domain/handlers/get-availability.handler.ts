import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import * as moment from 'moment';

import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../commands/get-availaiblity.query';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';
import {
  AVAILABILITY_CACHE,
  AvailabilityCache,
} from '../ports/availability-cache.port';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery>
{
  constructor(
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private alquilaTuCanchaClient: AlquilaTuCanchaClient,
    @Inject(AVAILABILITY_CACHE)
    private cache: AvailabilityCache,
  ) {}

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]> {
    const dateStr = moment(query.date).format('YYYY-MM-DD');

    let clubs = this.cache.getClubs(query.placeId);
    if (!clubs) {
      clubs = await this.alquilaTuCanchaClient.getClubs(query.placeId);
      this.cache.setClubs(query.placeId, clubs);
    }

    return Promise.all(
      clubs.map(async (club) => {
        let courts = this.cache.getCourts(club.id);
        if (!courts) {
          courts = await this.alquilaTuCanchaClient.getCourts(club.id);
          this.cache.setCourts(club.id, courts);
        }

        const courts_with_availability = await Promise.all(
          courts.map(async (court) => {
            let slots = this.cache.getSlots(club.id, court.id, dateStr);
            if (!slots) {
              slots = await this.alquilaTuCanchaClient.getAvailableSlots(
                club.id,
                court.id,
                query.date,
              );
              this.cache.setSlots(club.id, court.id, dateStr, slots);
            }

            return {
              ...court,
              available: slots,
            };
          }),
        );

        return {
          ...club,
          courts: courts_with_availability,
        };
      }),
    );
  }
}
