import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as moment from 'moment';

import { HTTPAlquilaTuCanchaClient } from './http-alquila-tu-cancha.client';

describe('HTTPAlquilaTuCanchaClient', () => {
  let client: HTTPAlquilaTuCanchaClient;

  const mockAxiosGet = jest.fn();

  beforeEach(async () => {
    mockAxiosGet.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HTTPAlquilaTuCanchaClient,
        {
          provide: HttpService,
          useValue: {
            axiosRef: {
              get: mockAxiosGet,
            },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('http://localhost:4000'),
          },
        },
      ],
    }).compile();

    client = module.get<HTTPAlquilaTuCanchaClient>(HTTPAlquilaTuCanchaClient);
  });

  it('deduplicates concurrent slot availability requests for a date 3 days in the future (Single Flight Pattern)', async () => {
    let resolveRequest!: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveRequest = resolve;
    });

    mockAxiosGet.mockImplementation(() => pendingPromise);

    const targetDate = moment().add(3, 'days').toDate();
    const targetDateStr = moment(targetDate).format('YYYY-MM-DD');

    const requests = Array.from({ length: 10 }).map(() =>
      client.getAvailableSlots(1, 10, targetDate),
    );

    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    expect(mockAxiosGet).toHaveBeenCalledWith(
      '/clubs/1/courts/10/slots',
      expect.objectContaining({
        params: { date: targetDateStr },
      }),
    );

    const mockSlots = [
      {
        price: 1500,
        duration: 60,
        datetime: `${targetDateStr}T14:00:00Z`,
        start: '14:00',
        end: '15:00',
        _priority: 1,
      },
    ];

    resolveRequest({ data: mockSlots });

    const results = await Promise.all(requests);

    expect(results).toHaveLength(10);
    results.forEach((res) => {
      expect(res).toEqual(mockSlots);
    });
  });
});
