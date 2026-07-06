import * as moment from 'moment';

import { Slot } from '../../domain/model/slot';
import { InMemoryAvailabilityCache } from './in-memory-availability.cache';

describe('InMemoryAvailabilityCache', () => {
  let cache: InMemoryAvailabilityCache;

  const sampleSlot: Slot = {
    price: 1000,
    duration: 60,
    datetime: '2022-08-25T10:00:00Z',
    start: '10:00',
    end: '11:00',
    _priority: 1,
  };

  beforeEach(() => {
    cache = new InMemoryAvailabilityCache();
  });

  it('stores and retrieves clubs and courts correctly', () => {
    cache.setClubs('place_1', [{ id: 10 }]);
    cache.setCourts(10, [{ id: 100 }]);

    expect(cache.getClubs('place_1')).toEqual([{ id: 10 }]);
    expect(cache.getCourts(10)).toEqual([{ id: 100 }]);
  });

  it('stores and retrieves slots within the 7-day valid window', () => {
    const validDateStr = moment().add(2, 'days').format('YYYY-MM-DD');

    cache.setSlots(1, 10, validDateStr, [sampleSlot]);
    expect(cache.getSlots(1, 10, validDateStr)).toEqual([sampleSlot]);
  });

  it('auto-evicts slots from past dates (stale TTL eviction)', () => {
    const pastDateStr = moment().subtract(1, 'day').format('YYYY-MM-DD');

    cache.setSlots(1, 10, pastDateStr, [sampleSlot]);
    expect(cache.getSlots(1, 10, pastDateStr)).toBeNull();
  });

  it('auto-evicts slots beyond the 7-day window', () => {
    const futureDateStr = moment().add(10, 'days').format('YYYY-MM-DD');

    cache.setSlots(1, 10, futureDateStr, [sampleSlot]);
    expect(cache.getSlots(1, 10, futureDateStr)).toBeNull();
  });

  it('adds and removes slots dynamically for real-time events', () => {
    const validDateStr = moment().add(1, 'day').format('YYYY-MM-DD');

    cache.addSlot(1, 10, validDateStr, sampleSlot);
    expect(cache.getSlots(1, 10, validDateStr)).toEqual([sampleSlot]);

    cache.removeSlot(1, 10, validDateStr, sampleSlot);
    expect(cache.getSlots(1, 10, validDateStr)).toEqual([]);
  });

  it('invalidates all courts and slots when invalidateClub is called', () => {
    const validDateStr = moment().add(1, 'day').format('YYYY-MM-DD');
    cache.setCourts(1, [{ id: 10 }]);
    cache.setSlots(1, 10, validDateStr, [sampleSlot]);

    cache.invalidateClub(1);

    expect(cache.getCourts(1)).toBeNull();
    expect(cache.getSlots(1, 10, validDateStr)).toBeNull();
  });

  it('invalidates specific court slots when invalidateCourt is called', () => {
    const validDateStr = moment().add(1, 'day').format('YYYY-MM-DD');
    cache.setCourts(1, [{ id: 10 }]);
    cache.setSlots(1, 10, validDateStr, [sampleSlot]);

    cache.invalidateCourt(1, 10);

    expect(cache.getSlots(1, 10, validDateStr)).toBeNull();
  });

  it('updates single club info surgically without invalidating courts or slots', () => {
    cache.setClubs('place_1', [{ id: 10, name: 'Old Club Name' } as any]);
    cache.updateClubInfo(10, { id: 10, name: 'New Club Name' } as any);

    expect(cache.getClubs('place_1')).toEqual([
      { id: 10, name: 'New Club Name' },
    ]);
  });
});
