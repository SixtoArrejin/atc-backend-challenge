import * as moment from 'moment';

import { InMemoryAvailabilityCache } from '../../infrastructure/cache/in-memory-availability.cache';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';
import { GetAvailabilityQuery } from '../commands/get-availaiblity.query';
import { Club } from '../model/club';
import { Court } from '../model/court';
import { Slot } from '../model/slot';
import { GetAvailabilityHandler } from './get-availability.handler';

describe('GetAvailabilityHandler', () => {
  let handler: GetAvailabilityHandler;
  let client: FakeAlquilaTuCanchaClient;
  let cache: InMemoryAvailabilityCache;

  beforeEach(() => {
    client = new FakeAlquilaTuCanchaClient();
    cache = new InMemoryAvailabilityCache();
    handler = new GetAvailabilityHandler(client, cache);
  });

  it('returns the availability', async () => {
    client.clubs = {
      '123': [{ id: 1 }],
    };
    client.courts = {
      '1': [{ id: 1 }],
    };
    client.slots = {
      '1_1_2022-12-05': [],
    };
    const placeId = '123';
    const date = moment('2022-12-05').toDate();

    const response = await handler.execute(
      new GetAvailabilityQuery(placeId, date),
    );

    expect(response).toEqual([{ id: 1, courts: [{ id: 1, available: [] }] }]);
  });

  it('returns empty array when client.getClubs fails gracefully (Mock API down or 429)', async () => {
    client.shouldFailClubs = true;
    const placeId = '123';
    const date = moment('2022-12-05').toDate();

    const response = await handler.execute(
      new GetAvailabilityQuery(placeId, date),
    );

    expect(response).toEqual([]);
  });

  it('returns partial availability gracefully when fetching slots fails', async () => {
    client.clubs = {
      '123': [{ id: 1 }],
    };
    client.courts = {
      '1': [{ id: 1 }],
    };
    client.shouldFailSlots = true;
    const placeId = '123';
    const date = moment('2022-12-05').toDate();

    const response = await handler.execute(
      new GetAvailabilityQuery(placeId, date),
    );

    expect(response).toEqual([{ id: 1, courts: [{ id: 1, available: [] }] }]);
  });
});

class FakeAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  clubs: Record<string, Club[]> = {};
  courts: Record<string, Court[]> = {};
  slots: Record<string, Slot[]> = {};
  shouldFailClubs = false;
  shouldFailCourts = false;
  shouldFailSlots = false;

  async getClubs(placeId: string): Promise<Club[]> {
    if (this.shouldFailClubs) {
      throw new Error('Mock API Down / Rate limit 429');
    }
    return this.clubs[placeId];
  }
  async getClub(clubId: number): Promise<Club> {
    if (this.shouldFailClubs) {
      throw new Error('Mock API Down / Rate limit 429');
    }
    for (const placeClubs of Object.values(this.clubs)) {
      const found = placeClubs.find((c) => c.id === clubId);
      if (found) return found;
    }
    return { id: clubId } as Club;
  }
  async getCourts(clubId: number): Promise<Court[]> {
    if (this.shouldFailCourts) {
      throw new Error('Mock API Down / Rate limit 429');
    }
    return this.courts[String(clubId)];
  }
  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    if (this.shouldFailSlots) {
      throw new Error('Mock API Down / Rate limit 429');
    }
    return this.slots[
      `${clubId}_${courtId}_${moment(date).format('YYYY-MM-DD')}`
    ];
  }
}
