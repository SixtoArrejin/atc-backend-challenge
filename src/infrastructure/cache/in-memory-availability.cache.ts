import { Injectable } from '@nestjs/common';

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
    const key = this.buildSlotKey(clubId, courtId, dateStr);
    return this.slotsByCourtAndDate.get(key) ?? null;
  }

  setSlots(
    clubId: number,
    courtId: number,
    dateStr: string,
    slots: Slot[],
  ): void {
    const key = this.buildSlotKey(clubId, courtId, dateStr);
    this.slotsByCourtAndDate.set(key, slots);
  }

  addSlot(clubId: number, courtId: number, dateStr: string, slot: Slot): void {
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
