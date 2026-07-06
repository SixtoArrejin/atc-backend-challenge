import { Club } from '../model/club';
import { Court } from '../model/court';
import { Slot } from '../model/slot';

export const AVAILABILITY_CACHE = 'AVAILABILITY_CACHE';

export interface AvailabilityCache {
  getClubs(placeId: string): Club[] | null;
  setClubs(placeId: string, clubs: Club[]): void;
  updateClubInfo(clubId: number, club: Club): void;

  getCourts(clubId: number): Court[] | null;
  setCourts(clubId: number, courts: Court[]): void;

  getSlots(clubId: number, courtId: number, dateStr: string): Slot[] | null;
  setSlots(
    clubId: number,
    courtId: number,
    dateStr: string,
    slots: Slot[],
  ): void;

  addSlot(clubId: number, courtId: number, dateStr: string, slot: Slot): void;
  removeSlot(
    clubId: number,
    courtId: number,
    dateStr: string,
    slot: Slot,
  ): void;

  invalidateClub(clubId: number): void;
  invalidateCourt(clubId: number, courtId: number): void;
}
