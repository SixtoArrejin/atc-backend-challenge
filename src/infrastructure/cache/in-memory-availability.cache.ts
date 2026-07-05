import { Injectable } from '@nestjs/common';
import * as moment from 'moment';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AvailabilityCache } from '../../domain/ports/availability-cache.port';

@Injectable()
export class InMemoryAvailabilityCache implements AvailabilityCache {
  private clubsByPlace = new Map<string, Club[]>();
  private courtsByClub = new Map<number, Court[]>();
  private slotsByCourtAndDate = new Map<string, Slot[]>();

  private buildSlotKey(
    clubId: number,
    courtId: number,
    dateStr: string,
  ): string {
    return `${clubId}_${courtId}_${dateStr}`;
  }

  private isWithin7DaysWindow(dateStr: string): boolean {
    const todayStr = moment().format('YYYY-MM-DD');
    const maxDateStr = moment().add(7, 'days').format('YYYY-MM-DD');
    return dateStr >= todayStr && dateStr <= maxDateStr;
  }

  private cleanStaleSlots(): void {
    const todayStr = moment().format('YYYY-MM-DD');
    const maxDateStr = moment().add(7, 'days').format('YYYY-MM-DD');

    for (const key of this.slotsByCourtAndDate.keys()) {
      const parts = key.split('_');
      const dateStr = parts[2];
      if (dateStr < todayStr || dateStr > maxDateStr) {
        this.slotsByCourtAndDate.delete(key);
      }
    }
  }

  getClubs(placeId: string): Club[] | null {
    return this.clubsByPlace.get(placeId) ?? null;
  }

  setClubs(placeId: string, clubs: Club[]): void {
    this.clubsByPlace.set(placeId, clubs);
  }

  getCourts(clubId: number): Court[] | null {
    return this.courtsByClub.get(clubId) ?? null;
  }

  setCourts(clubId: number, courts: Court[]): void {
    this.courtsByClub.set(clubId, courts);
  }

  getSlots(clubId: number, courtId: number, dateStr: string): Slot[] | null {
    this.cleanStaleSlots();
    const key = this.buildSlotKey(clubId, courtId, dateStr);
    return this.slotsByCourtAndDate.get(key) ?? null;
  }

  setSlots(
    clubId: number,
    courtId: number,
    dateStr: string,
    slots: Slot[],
  ): void {
    this.cleanStaleSlots();
    if (!this.isWithin7DaysWindow(dateStr)) {
      return;
    }
    const key = this.buildSlotKey(clubId, courtId, dateStr);
    this.slotsByCourtAndDate.set(key, slots);
  }

  addSlot(clubId: number, courtId: number, dateStr: string, slot: Slot): void {
    if (!this.isWithin7DaysWindow(dateStr)) {
      return;
    }
    const key = this.buildSlotKey(clubId, courtId, dateStr);
    const existing = this.slotsByCourtAndDate.get(key);
    if (!existing) {
      this.slotsByCourtAndDate.set(key, [slot]);
      return;
    }
    const alreadyExists = existing.some((s) => s.start === slot.start);
    if (!alreadyExists) {
      this.slotsByCourtAndDate.set(
        key,
        [...existing, slot].sort((a, b) => a.start.localeCompare(b.start)),
      );
    }
  }

  removeSlot(
    clubId: number,
    courtId: number,
    dateStr: string,
    slot: Slot,
  ): void {
    const key = this.buildSlotKey(clubId, courtId, dateStr);
    const existing = this.slotsByCourtAndDate.get(key);
    if (!existing) return;
    const updated = existing.filter((s) => s.start !== slot.start);
    this.slotsByCourtAndDate.set(key, updated);
  }
}
