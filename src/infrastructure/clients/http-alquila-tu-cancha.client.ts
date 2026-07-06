import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';

@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private base_url: string;
  private inFlightRequests = new Map<string, Promise<any>>();

  constructor(private httpService: HttpService, config: ConfigService) {
    this.base_url = config.get<string>('ATC_BASE_URL', 'http://localhost:4000');
  }

  private deduplicateRequest<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }
    const promise = fn().finally(() => {
      this.inFlightRequests.delete(key);
    });
    this.inFlightRequests.set(key, promise);
    return promise;
  }

  async getClubs(placeId: string): Promise<Club[]> {
    const key = `clubs_${placeId}`;
    return this.deduplicateRequest(key, () =>
      this.httpService.axiosRef
        .get('clubs', {
          baseURL: this.base_url,
          params: { placeId },
          timeout: 10000,
        })
        .then((res) => res.data),
    );
  }

  getClub(clubId: number): Promise<Club> {
    const key = `club_${clubId}`;
    return this.deduplicateRequest(key, () =>
      this.httpService.axiosRef
        .get(`/clubs/${clubId}`, {
          baseURL: this.base_url,
          timeout: 10000,
        })
        .then((res) => res.data),
    );
  }

  getCourts(clubId: number): Promise<Court[]> {
    const key = `courts_${clubId}`;
    return this.deduplicateRequest(key, () =>
      this.httpService.axiosRef
        .get(`/clubs/${clubId}/courts`, {
          baseURL: this.base_url,
          timeout: 10000,
        })
        .then((res) => res.data),
    );
  }

  getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    const dateStr = moment(date).format('YYYY-MM-DD');
    const key = `slots_${clubId}_${courtId}_${dateStr}`;
    return this.deduplicateRequest(key, () =>
      this.httpService.axiosRef
        .get(`/clubs/${clubId}/courts/${courtId}/slots`, {
          baseURL: this.base_url,
          params: { date: dateStr },
          timeout: 10000,
        })
        .then((res) => res.data),
    );
  }
}
